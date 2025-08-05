import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  constructor(private http: HttpClient) {}

  resizeImages(images: File[], width: number | null , height: number | null, percentage?:number): Observable<HttpResponse<Blob>> {
    const formData = new FormData();
    images.forEach(img => formData.append('images', img));
    if (percentage && percentage !== 100) {
      formData.append('resizePercentage', percentage.toString());
    } else {
      if (width !== null) formData.append('width', width.toString());
      if (height !== null) formData.append('height', height.toString());
    }

    return this.http.post('http://localhost:5000/resize', formData, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
