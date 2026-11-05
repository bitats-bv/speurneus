import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { vraagBlijvendeOpslag } from './data/db';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: '<router-outlet />',
})
export class App implements OnInit {
  ngOnInit(): void {
    void vraagBlijvendeOpslag();
  }
}
