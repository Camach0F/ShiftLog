# ShiftLog

App para iPhone, iPad y Android que combina una **agenda personal** con el **registro de turnos de trabajo**: anota qué trabajas cada día y calcula las horas (y, si quieres, los ingresos).

Hecha con [Expo](https://expo.dev) (React Native + TypeScript) y Expo Router. Los datos se guardan en el propio dispositivo; la app no envía nada a ningún servidor.

## Qué hace

La app tiene dos partes separadas:

- **Agenda** – citas, recordatorios y cumpleaños. Nunca cuentan en las horas, el resumen ni las exportaciones.
- **Turnos, Resumen y Trabajos** – lo que sí cuenta como horas trabajadas.

### Trabajos y turnos
- Varios **trabajos** (empleos o clientes), cada uno con nombre, color, tarifa por hora y reglas de horas extra.
- Cada trabajo tiene sus **tipos de turno** (por ejemplo Mañana, Tarde, Noche): son plantillas con horario y un descanso opcional.
- Los turnos son orientativos: al añadirlos a un día se pueden **ajustar las horas** solo para ese día, o usar «Otro horario» para escribir las tuyas.
- Se pueden poner **varios turnos el mismo día**, también del mismo trabajo.
- **Plantillas de trabajo** (integradas y las tuyas) para crear un trabajo sin volver a escribirlo.
- **Rotaciones** (por ejemplo 4 días de trabajo y 2 libres) que se repiten sobre un rango de fechas.
- **Edición múltiple** de días en el calendario.

### Horas y resumen
- Resumen por semana, mes o año, con desglose por trabajo y por turno.
- **Horas extra** por trabajo (límite diario y semanal, con multiplicador de pago).
- Exportación a **PDF** (informe por días) y **CSV**.

### Agenda
- Eventos de todo el día o con horas (se pueden tomar las horas de uno de tus turnos).
- Plantillas de evento, también integradas y propias.

### Diseño
- Modo claro y oscuro, adaptado a móvil y tablet (en pantallas anchas, barra lateral y calendario con el día a un lado).

## Cómo ejecutarla

Necesitas Node.js (una versión LTS reciente) y, para probarla, la app **Expo Go** en tu móvil o un simulador.

```bash
npm install
npm start
```

Después pulsa `i` (simulador de iOS) o `a` (emulador de Android), o escanea el QR con Expo Go.

> El proyecto incluye un `.npmrc` con `legacy-peer-deps=true` por un conflicto de versiones entre `react` y `react-dom`. Si añades dependencias con `npx expo install`, hazlo con `-- --legacy-peer-deps`.

### Comprobaciones
```bash
npx tsc --noEmit   # tipos
npm run lint       # lint
```

## Generar el APK de Android

El APK se compila en la nube con [EAS Build](https://docs.expo.dev/build/introduction/), sin pasar por Google Play. El perfil `apk` de `eas.json` genera un archivo instalable directamente.

```bash
npx eas-cli login      # una vez, con tu cuenta de Expo
npm run build:apk
```

Al terminar, Expo da un enlace para descargar el `.apk`. Para instalarlo en un móvil hay que permitir «instalar apps de orígenes desconocidos».

> **Clave de firma.** Las actualizaciones solo se instalan encima de la versión anterior si van firmadas con la misma clave. Expo la guarda en sus servidores; puedes hacer una copia con `npx eas-cli credentials`. **No subas nunca el archivo `.jks` ni un `credentials.json` al repositorio** (el `.gitignore` ya excluye los `.jks`).

## Estructura

```
src/
  app/            Pantallas (Expo Router)
    (tabs)/       Agenda, Turnos, Resumen y Trabajos
    day/ entry/ event/ job/ type/ rotation/   Pantallas modales
  components/     Cuadrícula del mes, selector de turnos, controles
  lib/            Modelo de datos, almacén, cálculo de horas, exportación, plantillas
```

El cálculo de horas, las horas extra y la migración de datos antiguos viven en `src/lib/hours.ts` y `src/lib/store.tsx`.

## Licencia

Todos los derechos reservados. Consulta [LICENSE](LICENSE).
