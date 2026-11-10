# Mantenimiento del perfil

El README de este repositorio aparece en <https://github.com/fasfis544> porque
el repositorio es público y tiene el mismo nombre que la cuenta.

## Editar el contenido

- `README.md`: presentación principal en español.
- `README.en.md`: versión en inglés. Actualizar ambas al cambiar el perfil.
- `assets/header.svg` y `assets/header-en.svg`: portadas editables en SVG.
- `assets/badges/`: botones de contacto; los destinos están en los README.
- `assets/projects/`: miniaturas optimizadas de capturas reales de los proyectos.
- `assets/stack/`: iconos de tecnologías guardados localmente.

La formación, disponibilidad y tecnologías se basan en el CV proporcionado por
Fabricio. Las descripciones de proyectos se contrastaron con sus repositorios.

## Estadísticas automáticas

`.github/workflows/activity.yml` actualiza `assets/activity.svg` diariamente,
aproximadamente a las **06:17 UTC**, o desde **Actions → Update profile activity →
Run workflow**. GitHub puede demorar ejecuciones programadas y pausarlas tras
60 días sin actividad en un repositorio público; se pueden reactivar en Actions.

El proceso usa el `GITHUB_TOKEN` automático del repositorio. No necesita crear
ni guardar un token personal. Solo lee datos de GitHub y actualiza la imagen.
Si la API falla, el workflow falla y se conserva la última imagen publicada.

- Contribuciones y commits: ventana móvil de doce meses que devuelve GitHub.
- Repositorios: públicos, propios y no forks; incluye este repositorio de perfil.
- Lenguajes: suma de bytes por lenguaje en esos repositorios, excluyendo el perfil.
- Calendario: días reales de contribución; color relativo al máximo del período.

El script usa Node.js 24 y no tiene dependencias. Para ejecutarlo localmente se
necesita un token válido en la variable de entorno `GITHUB_TOKEN`:

```sh
node scripts/update-activity.mjs
```

## Recursos visuales

- Portadas, botones, pie y panel de actividad: SVG personalizados para este perfil.
- Iconos: [Skill Icons](https://github.com/tandpfun/skill-icons), licencia MIT;
  [licencia incluida](../assets/stack/LICENSE). Los logotipos pertenecen a sus marcas.
- Cine Aurora: miniatura del catálogo de
  [`docs/capturas/peliculas.png`](https://github.com/fasfis544/FABRICIO-QUIROGA-TP1-PROG4-2026-C2/blob/main/docs/capturas/peliculas.png).
- SportsWear: miniatura de
  [`docs/capturas/02-tienda.png`](https://github.com/fasfis544/tp-integrador-backend/blob/main/docs/capturas/02-tienda.png).
- Gestión de tareas: miniatura de la captura publicada en su
  [README](https://github.com/fasfis544/Gestion-de-tareas-base-en-supabase).

Las miniaturas pueden recortar las capturas para presentarlas como portada.
Las imágenes completas y la documentación están en cada proyecto.
