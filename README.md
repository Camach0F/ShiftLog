# ShiftLog

[![Última versión](https://img.shields.io/github/v/release/Camach0F/ShiftLog?label=versi%C3%B3n)](https://github.com/Camach0F/ShiftLog/releases/latest)
[![Compilación](https://img.shields.io/github/actions/workflow/status/Camach0F/ShiftLog/android-apk.yml?label=APK)](https://github.com/Camach0F/ShiftLog/actions/workflows/android-apk.yml)
[![Licencia MIT](https://img.shields.io/github/license/Camach0F/ShiftLog)](LICENSE)
![Plataforma Android](https://img.shields.io/badge/plataforma-Android-3DDC84?logo=android&logoColor=white)

App para **Android** que combina una **agenda personal** con el **registro de turnos de trabajo**: anota qué trabajas cada día y calcula las horas (y, si quieres, los ingresos).

Gratuita, sin anuncios, sin cuentas y de código abierto. Todo está desbloqueado. Los datos se guardan en el propio dispositivo; la app no envía nada a ningún servidor.

**[⬇ Descargar el APK](https://github.com/Camach0F/ShiftLog/releases/latest)** · [Cómo instalarla](#instalar-la-app) · [Apoya el proyecto](#apoya-el-proyecto)

## Qué hace

La app tiene dos partes separadas:

- **Agenda** – citas, recordatorios y cumpleaños. Nunca cuentan en las horas, el resumen ni las exportaciones.
- **Turnos, Resumen y Trabajos** – lo que sí cuenta como horas trabajadas.

### Trabajos y turnos
- Varios **trabajos** (empleos o clientes), cada uno con nombre, color y forma de cobro: **por horas** (tarifa por hora y reglas de horas extra) o **por trabajo** (un precio fijo cada vez que lo añades al calendario).
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
- Horas y fechas con teclado numérico (los dos puntos y los guiones se añaden solos) o con el selector nativo de Android.

## Instalar la app

1. Descarga el último `ShiftLog-x.y.z.apk` desde [Releases](https://github.com/Camach0F/ShiftLog/releases/latest) en tu móvil o tablet Android.
2. Ábrelo y, si Android lo pide, permite «instalar apps de orígenes desconocidos» para el navegador o el gestor de archivos que uses.
3. Para actualizar, instala el APK de la versión nueva encima: se conservan tus datos.

Los APK los compila y firma GitHub Actions a partir de este código, así que el archivo de Releases es el que sale del repositorio. Requiere Android 7 o superior.

## Desarrollo

Todo se comprueba y se compila en GitHub; no se usa Expo Go ni ningún servicio externo. En local solo hace falta Node.js (una versión LTS reciente) para las comprobaciones:

```bash
npm install
npx tsc --noEmit   # tipos
npm run lint       # lint
```

> El proyecto incluye un `.npmrc` con `legacy-peer-deps=true` por un conflicto de versiones entre `react` y `react-dom`. Si añades dependencias con `npx expo install`, hazlo con `-- --legacy-peer-deps`.

## Generar el APK de Android

El APK lo compila **GitHub Actions** (flujo `.github/workflows/android-apk.yml`): genera el proyecto de Android con `expo prebuild`, lo compila con Gradle y lo firma con tu clave. No hace falta Android Studio ni ningún servicio de pago.

### Una sola vez: crear la clave de firma
Necesitas [`openssl`](https://www.openssl.org) y la CLI de GitHub (`gh`) con sesión iniciada. Desde la carpeta del proyecto:

```bash
./scripts/create-signing-key.sh
```

Esto crea una clave, guarda su contraseña aleatoria como **secretos del repositorio** (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`) y deja una copia en `~/ShiftLog-signing`. **Guarda esa copia en un gestor de contraseñas**: las actualizaciones solo se instalan encima de la versión anterior si van firmadas con la misma clave. Nunca subas esos archivos al repositorio.

### Compilar
- **A mano:** en la pestaña *Actions* de GitHub, elige *Build Android APK* y pulsa *Run workflow*. El APK queda como artefacto de la ejecución.
- **Publicar una versión:** crea y sube una etiqueta, por ejemplo:
  ```bash
  git tag v1.0.1 && git push origin v1.0.1
  ```
  El flujo compila el APK y lo publica en *Releases* con ese número de versión.

## Estructura

```
src/
  app/            Pantallas
    (tabs)/       Agenda, Turnos, Resumen y Trabajos
    day/ entry/ event/ job/ type/ rotation/   Pantallas de detalle y edición
  components/     Cuadrícula del mes, selector de turnos, controles
  lib/            Modelo de datos, almacén, cálculo de horas, exportación, plantillas
```

El cálculo de horas, las horas extra y la migración de datos antiguos viven en `src/lib/hours.ts` y `src/lib/store.tsx`.

## Apoya el proyecto

ShiftLog es gratuita y de código abierto, y siempre lo será. Si te resulta útil y quieres ayudar a seguir mejorándola, puedes hacer una donación voluntaria:

[![Donar por PayPal](https://img.shields.io/badge/Donar-PayPal-0070BA?logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/jcamachopay)

Donar no desbloquea nada: la app es igual para todos. Gracias por el apoyo.

## Licencia

Código abierto bajo la licencia [MIT](LICENSE). Puedes usarlo, modificarlo y distribuirlo libremente manteniendo el aviso de copyright.

Es un proyecto independiente: no está afiliado a ninguna otra app de turnos ni reutiliza su nombre, textos o diseño.
