import { Component, ChangeDetectorRef } from '@angular/core';
import { ResizeService } from '../services/resize.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-resize',
  templateUrl: './resize.component.html',
  imports: [CommonModule, FormsModule]
})
export class ResizeComponent {
  selectedImages: File[] = [];
  width: number = 300;
  height: number = 300;
  customWidth: number | null = null;
  customHeight: number | null = null;
  isCustom: boolean = false;

  uploadedFileNames: string[] = [];


  constructor(private resizeService: ResizeService, private cdr: ChangeDetectorRef) {}

  onImageSelect(event: any): void {
    const files: FileList = event.target.files;
    const newImages: File[] = [];
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push(file);
      }
    }
  
    this.selectedImages = [...this.selectedImages, ...newImages];
    this.cdr.detectChanges();
  }

  isDragOver = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  
    const items = event.dataTransfer?.items;
    const newImages: File[] = [];
    const seen = new Set<string>();
    let pending = 0;
  
    const finalizeDrop = () => {
      if (pending === 0) {
        // Deduplicate and batch update
        const uniqueNew = newImages.filter(file => {
          const key = file.name + file.lastModified;
          if (!seen.has(key)) {
            seen.add(key);
            return true;
          }
          return false;
        });
        this.selectedImages = [...this.selectedImages, ...uniqueNew];
        this.cdr.detectChanges();
      }
    };
  
    const traverseFileTree = (item: any) => {
      if (item.isFile) {
        pending++;
        item.file((file: File) => {
          if (file.type.startsWith('image/')) {
            newImages.push(file);
          }
          pending--;
          finalizeDrop();
        });
      } else if (item.isDirectory) {
        const reader = item.createReader();
        const readEntries = () => {
          reader.readEntries((entries: any[]) => {
            if (entries.length === 0) {
              finalizeDrop();
              return;
            }
            entries.forEach((entry: any) => traverseFileTree(entry));
            readEntries();
          });
        };
        readEntries();
      }
    };
  
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) traverseFileTree(entry);
      }
    }
  }
  
  

  traverseFileTree(item: any): void {
    if (item.isFile) {
      item.file((file: File) => {
        if (file.type.startsWith('image/')) {
          this.selectedImages.push(file);
        }
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries((entries: any[]) => {
        for (const entry of entries) {
          this.traverseFileTree(entry); 
        }
      });
    }
  }

  clearImages(): void {
    this.selectedImages = [];
    console.log('Image selection cleared.');
  }
  
  getImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }
  
  hoveredFile: File | null = null;

    openFile(file: File): void {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    }

    removeFile(index: number): void {
      this.selectedImages.splice(index, 1);
      this.selectedImages = [...this.selectedImages];
      this.cdr.detectChanges();
    }
    


    isUploading: boolean = false;
 
  onSubmit(): void {
    // console.log('Submit button clicked');
  
    if (!this.selectedImages.length || !this.width || !this.height) {
      alert('Please select image(s) and provide dimensions');
      return;
    }

    this.isUploading = true;
  
    this.resizeService.resizeImages(this.selectedImages, this.width, this.height).subscribe({
      next: (response) => {
        console.log('Headers:', response.headers);
        console.log('Content-Disposition:', response.headers.get('content-disposition'));
        const contentDisposition = response.headers.get('content-disposition');
        var filename = '';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            filename = match[1].replace(/['"]/g, '');
          }
        }

        // Save filename to show in UI
        this.uploadedFileNames = [filename];
  
        const blob = new Blob([response.body!], {
          type: response.body?.type || 'application/octet-stream'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Resize failed:', err);
        alert('Failed to resize image(s).');
      }
    });
  }
  

  onDimensionSelect(event: any) {
    const value = event.target.value;
  
    if (value === 'custom') {
      this.isCustom = true;
      this.width = 0;
      this.height = 0;
    } else {
      this.isCustom = false;
      const [w, h] = value.split('x');
      this.width = +w;
      this.height = +h;
    }
  }
  
  
  
}
