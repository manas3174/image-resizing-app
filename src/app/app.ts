import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ResizeComponent } from './resize/resize.component';

@Component({
  selector: 'app-root',
  imports: [ResizeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'sample-app';
}
