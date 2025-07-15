import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  constructor(private http: HttpClient) {}

  resizeImages(images: File[], width: number, height: number): Observable<HttpResponse<Blob>> {
    const formData = new FormData();
    images.forEach(img => formData.append('images', img));
    formData.append('width', width.toString());
    formData.append('height', height.toString());

    return this.http.post('http://localhost:5000/resize', formData, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
