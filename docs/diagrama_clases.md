# Modelo Conceptual y Lógico

## Clase: NAP
| Atributo           | Tipo    |
|--------------------|---------|
| id                 | UUID    |
| codigo             | string  |
| modelo             | string  |
| firmware           | string  |
| estado             | EstadoNAP |
| capacidadPuertos   | int     |
| geom               | Point   |
| fechaInstalacion   | Date    |

*Métodos:*
- actualizarEstado(estado: EstadoNAP): void
- porcentajeOcupacion(): float

---

## Clase: Puerto
| Atributo      | Tipo          |
|---------------|---------------|
| id            | UUID          |
| numero        | int           |
| estado        | EstadoPuerto  |
| observacion   | string        |

*Métodos:*
- asignarUsuario(usuario: Cliente): void
- liberar(): void

*Relaciones:*
- Un *NAP* contiene *muchos Puertos*.
- Un *Puerto* pertenece a *un NAP*.

---

## Clase: Cliente
| Atributo       | Tipo     |
|----------------|----------|
| id             | UUID     |
| nroDocumento   | string   |
| nombre         | string   |
| direccion      | string   |
| telefono       | string   |
| email          | string   |

*Relaciones:*
- Un *Puerto* puede estar asignado a un *Cliente* a través de *Asignación*.

---

## Clase: Asignación
| Atributo    | Tipo     |
|-------------|----------|
| id          | UUID     |
| fechaAlta   | Date     |
| fechaBaja   | Date     |
| activo      | boolean  |

*Relaciones:*
- Un *Cliente* puede tener muchas *Asignaciones*.
- Cada *Asignación* está vinculada a *un Puerto*.

---

## Clase: Mantenimiento
| Atributo      | Tipo     |
|---------------|----------|
| id            | UUID     |
| tipo          | string   |
| descripcion   | string   |
| fecha         | Date     |
| creadoPor     | UUID     |

*Relaciones:*
- Un *NAP* puede tener *muchos Mantenimientos*.

---

## Enumeración: EstadoNAP
- ACTIVO  
- MANTENIMIENTO  
- SATURADO  

---

## Enumeración: EstadoPuerto
- LIBRE  
- OCUPADO  
- MANTENIMIENTO  

---

## Clase: PlanServicio
| Atributo      | Tipo     |
|---------------|----------|
| id            | UUID     |
| nombre        | string   |
| anchoBandaMbps| int      |
| precio        | decimal  |

---

## Clase: Auditoria
| Atributo      | Tipo     |
|---------------|----------|
| id            | UUID     |
| entidad       | string   |
| entidadId     | UUID     |
| accion        | string   |
| usuarioId     | UUID     |
| fecha         | Date     |
| detalle       | string   |

*Relaciones:*
- Un *Usuario* puede registrar *muchas Auditorías*.

---

## Clase: Usuario
| Atributo        | Tipo     |
|-----------------|----------|
| id              | UUID     |
| nombre          | string   |
| email           | string   |
| hashPassword    | string   |
| rol             | Rol      |
| estado          | boolean  |
| fechaCreacion   | Date     |

*Métodos:*
- verPerfil(): void
- activar(): void
- desactivar(): void

---

## Enumeración: Rol
- ADMIN  
- TECNICO  
- SUPERVISOR  

---

## Clase: Reporte
| Atributo      | Tipo       |
|---------------|------------|
| id            | UUID       |
| tipo          | TipoReporte|
| rangoFecha    | string     |
| rutaArchivo   | string     |
| generadoPor   | UUID       |

*Métodos:*
- generarPDF(): string
- generarExcel(): string

*Relaciones:*
- Un *Usuario* puede generar *muchos Reportes*.

---

## Enumeración: TipoReporte
- DISPONIBILIDAD  
- CAPACIDAD  
- INVENTARIO  
- ATT