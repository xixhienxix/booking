import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Booking';

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('✅ AppComponent initialized');
    console.log('🔀 Current URL:', this.router.url);
    
    this.router.events.subscribe(event => {
      console.log('🔀 Router event:', event);
    });
  }
}
