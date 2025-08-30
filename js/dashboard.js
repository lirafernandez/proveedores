import { SupabaseService } from './services/supabaseService.js';

class DashboardManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            // Usamos Promise.all para cargar proveedores y criterios en paralelo
            const [proveedoresResult, criteria] = await Promise.all([
                this.supabase.obtenerProveedores({ porPagina: 0 }),
                this.supabase.obtenerCriterios()
            ]);

            const suppliers = proveedoresResult.data;

            this.renderSupplierStatusChart(suppliers);
            this.renderCriteriaComplianceChart(suppliers, criteria);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            const mainContent = document.querySelector('main');
            if(mainContent) {
                mainContent.innerHTML = '<div class="text-center text-red-500">Error al cargar los datos del dashboard.</div>';
            }
        }
    }

    // Lógica para determinar el estado, consistente con proveedores.js
    determinarEstado(evaluacionAlta, evaluacionInterna) {
        let puntajeFinal;

        const altaExiste = evaluacionAlta && evaluacionAlta.puntaje !== undefined;
        const internaExiste = evaluacionInterna && evaluacionInterna.puntaje !== undefined;

        if (internaExiste) {
            // La evaluación interna siempre tiene precedencia para reflejar el rendimiento actual
            puntajeFinal = evaluacionInterna.puntaje;
        } else if (altaExiste) {
            // Si no hay interna, se usa la de alta
            puntajeFinal = evaluacionAlta.puntaje;
        } else {
            // Sin ninguna evaluación, está pendiente
            return 'PENDIENTE';
        }

        if (puntajeFinal > 80) return 'APROBADO';
        if (puntajeFinal >= 60) return 'CONDICIONADO';
        return 'RECHAZADO';
    }

    renderSupplierStatusChart(suppliers) {
        const ctx = document.getElementById('supplierStatusChart')?.getContext('2d');
        if (!ctx) return;

        const statusCounts = {
            'APROBADO': 0,
            'CONDICIONADO': 0,
            'RECHAZADO': 0,
            'PENDIENTE': 0
        };

        suppliers.forEach(supplier => {
            const status = this.determinarEstado(supplier.evaluaciones?.ALTA, supplier.evaluaciones?.INTERNA);
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: 'Estado de Proveedores',
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#10B981', // APROBADO (Verde)
                        '#F59E0B', // CONDICIONADO (Ámbar)
                        '#EF4444', // RECHAZADO (Rojo)
                        '#6B7280'  // PENDIENTE (Gris)
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    renderCriteriaComplianceChart(suppliers, allCriteria) {
        const ctx = document.getElementById('criteriaComplianceChart')?.getContext('2d');
        if (!ctx) return;

        const altaCriteria = allCriteria.filter(c => c.tipo_evaluacion === 'ALTA');
        const criteriaCompliance = {};

        altaCriteria.forEach(criterio => {
            const criterioKey = `criterio-${criterio.id}`;
            let count = 0;
            suppliers.forEach(supplier => {
                // Solo contamos si la evaluación de ALTA existe para este proveedor
                if (supplier.evaluaciones?.ALTA && supplier.evaluaciones.ALTA.criterios?.[criterioKey]) {
                    count++;
                }
            });
            criteriaCompliance[criterio.nombre] = count;
        });

        const chartLabels = Object.keys(criteriaCompliance);
        const chartData = Object.values(criteriaCompliance);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Nº de Proveedores que Cumplen',
                    data: chartData,
                    backgroundColor: '#3B82F6', // Azul
                    borderRadius: 4,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1 // Asegura que el eje X solo muestre enteros
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
