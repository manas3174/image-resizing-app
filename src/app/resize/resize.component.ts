import { Component } from '@angular/core';
import { ResizeService } from '../services/resize.service';

@Component({
  selector: 'app-resize',
  templateUrl: './resize.component.html',
})
export class ResizeComponent {
  selectedImages: File[] = [];
  width: number = 300;
  height: number = 300;

  constructor(private resizeService: ResizeService) {}

  onImageSelect(event: any): void {
    this.selectedImages = Array.from(event.target.files);
    console.log('Selected images:', this.selectedImages);
  }

  onSubmit(): void {

    console.log('Submit button clicked'); // this line verifies the button works

    if (!this.selectedImages.length || !this.width || !this.height) {
      alert('Please select image(s) and provide dimensions');
      return;
    }

    this.resizeService.resizeImages(this.selectedImages, this.width, this.height).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('content-disposition');
        var filename = '';

        if (contentDisposition) {
        console.log('Content-Disposition:', contentDisposition); // DEBUG

        const match = /filename="?([^"]+)"?/.exec(contentDisposition);
        if (match && match[1]) {
            filename = match[1];
        }
        }
        const blob = new Blob([response.body!], {
            type: response.body?.type || 'application/octet-stream'
          });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: (err) => {
        console.error('Resize failed:', err);
        alert('Failed to resize image(s).');
      }
    });
  }

  onDimensionSelect(event: any) {
    const [w, h] = event.target.value.split('x');
    this.width = +w;
    this.height = +h;
  }
  
}
