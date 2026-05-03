import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Booking';

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('✅ AppComponent initialized');
    console.log('🔀 Current URL:', this.router.url);

    this.router.events.subscribe(event => {
      console.log('🔀 Router event:', event);
    });
  }

  ngAfterViewInit() {
    // Auto-resize iframe on the host WordPress page
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'booking-widget-resize', height }, '*');
    };

    // Send on load
    sendHeight();

    // Send whenever DOM size changes (step transitions, search results loading, etc.)
    const observer = new ResizeObserver(() => sendHeight());
    observer.observe(document.body);

    // Also send on route changes
    this.router.events.subscribe(() => {
      setTimeout(sendHeight, 100); // slight delay for DOM to settle
    });
  }
}