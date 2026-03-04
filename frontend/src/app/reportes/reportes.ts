import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Layout } from '../components/layout/layout';
import { ReporteService, TipoReporte, RespuestaReporte } from '../services/reporte.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesComponent implements OnInit {
  private readonly reporteService = inject(ReporteService);

  // Datos
  tiposReporte = signal<TipoReporte[]>([]);
  reporteSeleccionado = signal<TipoReporte | null>(null);
  resultadoReporte = signal<RespuestaReporte | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Filtros por categoría
  categoriaSeleccionada = signal<'TODAS' | 'Infraestructura' | 'Clientes'>('TODAS');

  // Parámetros del reporte
  parametros = signal<any>({
    fecha_desde: '',
    fecha_hasta: '',
    cliente_id: '',
    meses: 6
  });

  periodoRapido = signal<string>('semana');

  // Reportes filtrados por categoría
  tiposFiltrados = computed(() => {
    const categoria = this.categoriaSeleccionada();
    if (categoria === 'TODAS') {
      return this.tiposReporte();
    }
    return this.tiposReporte().filter(t => t.categoria === categoria);
  });

  ngOnInit() {
    this.cargarTiposReporte();
  }

  cargarTiposReporte() {
    this.isLoading.set(true);
    this.reporteService.obtenerTiposReporte().subscribe({
      next: (response) => {
        if (response.success) {
          this.tiposReporte.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar tipos de reportes:', error);
        this.error.set('Error al cargar los tipos de reportes');
        this.isLoading.set(false);
      }
    });
  }

  seleccionarReporte(tipo: TipoReporte) {
    this.reporteSeleccionado.set(tipo);
    this.resultadoReporte.set(null);
    this.error.set(null);
    this.parametros.set({ fecha_desde: '', fecha_hasta: '', cliente_id: '', meses: 6 });

    // Si el reporte usa fechas, aplicar "última semana" por defecto
    if (tipo.parametros.includes('fecha_desde')) {
      this.setPeriodoRapido('semana');
    } else {
      this.periodoRapido.set('');
    }
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  setPeriodoRapido(periodo: string) {
    this.periodoRapido.set(periodo);
    const hoy = new Date();
    const hasta = this.toDateStr(hoy);
    let desde: string;

    switch (periodo) {
      case 'semana':
        desde = this.toDateStr(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7));
        break;
      case 'mes':
        desde = this.toDateStr(new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate()));
        break;
      case '3meses':
        desde = this.toDateStr(new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate()));
        break;
      case '6meses':
        desde = this.toDateStr(new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate()));
        break;
      case 'anio':
        desde = this.toDateStr(new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate()));
        break;
      default:
        return;
    }

    this.parametros.update(p => ({ ...p, fecha_desde: desde, fecha_hasta: hasta }));
  }

  generarReporte() {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return;

    this.isLoading.set(true);
    this.error.set(null);

    const params = this.construirParametros();

    this.reporteService.generarReporte(reporte.id, params).subscribe({
      next: (response) => {
        if (response.success) {
          this.resultadoReporte.set(response);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al generar reporte:', error);
        this.error.set('Error al generar el reporte');
        this.isLoading.set(false);
      }
    });
  }

  descargarJSON() {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return;

    const params = this.construirParametros();
    this.reporteService.descargarJSON(reporte.id, params);
  }

  descargarPDF() {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return;

    const params = this.construirParametros();
    this.reporteService.descargarPDF(reporte.id, params);
  }

  descargarExcel() {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return;

    const params = this.construirParametros();
    this.reporteService.descargarExcel(reporte.id, params);
  }

  construirParametros(): any {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return {};

    const params: any = {};
    const p = this.parametros();

    // Solo incluir parámetros que el reporte necesita
    reporte.parametros.forEach(paramNombre => {
      if (paramNombre === 'fecha_desde' && p.fecha_desde) {
        params.fecha_desde = p.fecha_desde;
      }
      if (paramNombre === 'fecha_hasta' && p.fecha_hasta) {
        params.fecha_hasta = p.fecha_hasta;
      }
      if (paramNombre === 'cliente_id' && p.cliente_id) {
        params.cliente_id = p.cliente_id;
      }
      if (paramNombre === 'meses' && p.meses) {
        params.meses = p.meses;
      }
    });

    return params;
  }

  actualizarParametro(campo: string, event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.parametros.update(p => ({ ...p, [campo]: valor }));
    if (campo === 'fecha_desde' || campo === 'fecha_hasta') {
      this.periodoRapido.set('');
    }
  }

  volver() {
    this.reporteSeleccionado.set(null);
    this.resultadoReporte.set(null);
    this.error.set(null);
  }

  cambiarCategoria(event: Event) {
    const valor = (event.target as HTMLSelectElement).value as any;
    this.categoriaSeleccionada.set(valor);
  }

  getIconoCategoria(categoria: string): string {
    switch (categoria) {
      case 'Infraestructura': return '🏗️';
      case 'Clientes': return '👥';
      default: return '📊';
    }
  }

  getColorCategoria(categoria: string): string {
    switch (categoria) {
      case 'Infraestructura': return 'bg-blue-100 text-blue-800';
      case 'Clientes': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  necesitaParametro(parametro: string): boolean {
    const reporte = this.reporteSeleccionado();
    return reporte ? reporte.parametros.includes(parametro) : false;
  }

  // Helper para formatear keys en el template
  formatearKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Helper para formatear valores del resumen
  formatearValor(valor: any): string {
    if (valor === null || valor === undefined) {
      return 'N/A';
    }

    // Si es un número, formatearlo con separadores de miles
    if (typeof valor === 'number') {
      return valor.toLocaleString('es-ES');
    }

    // Si es string, devolverlo tal cual
    if (typeof valor === 'string') {
      return valor;
    }

    // Si es objeto o array, no mostrarlo (ya no debería pasar con el backend corregido)
    if (typeof valor === 'object') {
      return 'Ver datos detallados';
    }

    return String(valor);
  }

  // Obtener todas las columnas de un array de objetos (incluyendo anidados)
  obtenerColumnas(data: any[]): string[] {
    if (!data || data.length === 0) return [];

    const columnas = new Set<string>();

    const extraerColumnas = (obj: any, prefijo = '') => {
      Object.keys(obj).forEach(key => {
        const valor = obj[key];
        const nombreCompleto = prefijo ? `${prefijo}.${key}` : key;

        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          // Si es un objeto, extraer sus propiedades anidadas
          extraerColumnas(valor, nombreCompleto);
        } else if (!Array.isArray(valor)) {
          // Si no es un array, agregarlo como columna
          columnas.add(nombreCompleto);
        }
      });
    };

    // Analizar todos los objetos para obtener todas las columnas posibles
    data.forEach(item => extraerColumnas(item));

    return Array.from(columnas);
  }

  // Obtener valor anidado de un objeto usando notación de punto
  obtenerValorAnidado(obj: any, ruta: string): any {
    return ruta.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  // Formatear valor de celda en tabla
  formatearValorCelda(valor: any): string {
    if (valor === null || valor === undefined) {
      return '-';
    }

    // Si es un número, formatearlo
    if (typeof valor === 'number') {
      return valor.toLocaleString('es-ES');
    }

    // Si es booleano
    if (typeof valor === 'boolean') {
      return valor ? 'Sí' : 'No';
    }

    // Si es fecha
    if (valor instanceof Date || (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor))) {
      try {
        const fecha = new Date(valor);
        return fecha.toLocaleDateString('es-ES');
      } catch {
        return String(valor);
      }
    }

    // Si es array, mostrar la cantidad de elementos
    if (Array.isArray(valor)) {
      return valor.length > 0 ? valor.join(', ') : '-';
    }

    // Si es objeto, convertir a JSON compacto
    if (typeof valor === 'object') {
      return JSON.stringify(valor);
    }

    return String(valor);
  }

  // Exponer Object.keys para el template
  Object = Object;
}
