import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartType } from 'chart.js';
import { ensureChartJsRegistered } from './register-chart';


@Component({
  selector: 'app-telemetry-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div style="height:220px;"><canvas #cv></canvas></div>`,
})
export class TelemetryChartComponent implements OnChanges, OnDestroy {
  @ViewChild('cv', { static: true }) cv!: ElementRef<HTMLCanvasElement>;

  @Input() title = '';
  @Input() labels: string[] = [];
  @Input() values: number[] = [];

  private chart?: Chart;

  ngOnChanges(changes: SimpleChanges): void {
    ensureChartJsRegistered();
    // create once
    if (!this.chart) {
      const ctx = this.cv.nativeElement.getContext('2d');
      if (!ctx) return;

      const type: ChartType = 'line';

      this.chart = new Chart(ctx, {
        type,
        data: {
          labels: this.labels,
          datasets: [
            {
              label: this.title,
              data: this.values,
              tension: 0.2,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: true } },
          scales: { x: { ticks: { maxRotation: 0, autoSkip: true } } },
        },
      });
      return;
    }

    // update existing
    this.chart.data.labels = this.labels;
    this.chart.data.datasets[0].label = this.title;
    this.chart.data.datasets[0].data = this.values as any;
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
