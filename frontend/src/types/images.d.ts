// Tipos de las imágenes importadas (import foto from './foto.jpg').
// Next los declara en next-env.d.ts, pero ese archivo se genera al compilar y
// no está en git: sin esto, el type check del CI (que corre antes del build) falla.
/// <reference types="next/image-types/global" />
