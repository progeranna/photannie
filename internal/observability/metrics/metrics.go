package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	reg *prometheus.Registry

	reqTotal *prometheus.CounterVec
	reqDur   *prometheus.HistogramVec
}

func New(service string) *Metrics {
	reg := prometheus.NewRegistry()

	reg.MustRegister(
		prometheus.NewGoCollector(),
		prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
	)

	reqTotal := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace:   "photannie",
			Subsystem:   "http",
			Name:        "requests_total",
			Help:        "Total number of HTTP requests",
			ConstLabels: prometheus.Labels{"service": service},
		},
		[]string{"method", "route", "status"},
	)

	reqDur := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace:   "photannie",
			Subsystem:   "http",
			Name:        "request_duration_seconds",
			Help:        "HTTP request duration in seconds",
			ConstLabels: prometheus.Labels{"service": service},
			Buckets:     []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "route"},
	)

	reg.MustRegister(reqTotal, reqDur)

	return &Metrics{
		reg:      reg,
		reqTotal: reqTotal,
		reqDur:   reqDur,
	}
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.reg, promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	})
}

func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()

		next.ServeHTTP(ww, r)

		route := chi.RouteContext(r.Context()).RoutePattern()
		if route == "" {
			route = r.URL.Path
		}

		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}

		m.reqTotal.WithLabelValues(r.Method, route, strconv.Itoa(status)).Inc()
		m.reqDur.WithLabelValues(r.Method, route).Observe(time.Since(start).Seconds())
	})
}
