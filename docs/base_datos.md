# Modelo de Base de Datos

## Tabla: usuarios
| Campo         | Tipo      |
|---------------|-----------|
| id            | uuid      |
| correo        | varchar   |
| nombre        | varchar   |
| rol           | varchar   |
| activo        | boolean   |
| clave         | varchar   |
| fecha_creacion| timestamp |

---

## Tabla: naps
| Campo             | Tipo      |
|-------------------|-----------|
| id                | uuid      |
| codigo            | varchar   |
| modelo            | varchar   |
| firmware          | varchar   |
| estado            | varchar   |
| total_puertos     | int       |
| ubicacion         | varchar   |
| fecha_creacion    | timestamp |
| fecha_actualizacion | timestamp |

---

## Tabla: puertos
| Campo     | Tipo    |
|-----------|---------|
| id        | uuid    |
| nap_id    | uuid    |
| numero    | int     |
| estado    | varchar |
| nota      | varchar |

---

## Tabla: clientes
| Campo         | Tipo      |
|---------------|-----------|
| id            | uuid      |
| ci            | varchar   |
| nombre        | varchar   |
| telefono      | varchar   |
| correo        | varchar   |
| direccion     | varchar   |
| fecha_creacion| timestamp |

---

## Tabla: planes
| Campo          | Tipo    |
|----------------|---------|
| id             | uuid    |
| nombre         | varchar |
| velocidad_mbps | int     |
| descripcion    | varchar |

---

## Tabla: reportes
| Campo        | Tipo      |
|--------------|-----------|
| id           | uuid      |
| tipo         | varchar   |
| parametros   | varchar   |
| archivo      | varchar   |
| fecha        | timestamp |
| generado_por | uuid      |

---

## Tabla: conexiones
| Campo         | Tipo      |
|---------------|-----------|
| id            | uuid      |
| puerto_id     | uuid      |
| cliente_id    | uuid      |
| plan_id       | uuid      |
| fecha_inicio  | date      |
| fecha_fin     | date      |
| estado        | varchar   |
| creado_por    | uuid      |
| fecha_creacion| timestamp |

---

## Tabla: mantenimientos
| Campo        | Tipo      |
|--------------|-----------|
| id           | uuid      |
| nap_id       | uuid      |
| tipo         | varchar   |
| descripcion  | varchar   |
| fecha        | timestamp |
| realizado_por| uuid      |

---

## Tabla: intervenciones
| Campo        | Tipo      |
|--------------|-----------|
| id           | uuid      |
| nap_id       | uuid      |
| puerto_id    | uuid      |
| tipo         | varchar   |
| detalle      | varchar   |
| fecha        | timestamp |
| realizado_por| uuid      |

---

## Tabla: auditoria
| Campo          | Tipo      |
|----------------|-----------|
| id             | int       |
| tabla          | varchar   |
| registro_id    | uuid      |
| accion         | varchar   |
| datos_anteriores | varchar |
| datos_nuevos   | varchar   |
| cambiado_por   | uuid      |
| fecha          | timestamp |