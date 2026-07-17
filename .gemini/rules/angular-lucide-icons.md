# Rule: Importación y Declaración de Iconos de Lucide en Angular

## Contexto
En este proyecto de Angular, se utiliza `lucide-angular` para renderizar iconos vectoriales. Para que las plantillas HTML puedan resolver las directivas de iconos (ej. `<lucide-icon [name]="IconName">` o `<lucide-angular [img]="IconName">`), el componente TypeScript debe declarar dicha propiedad.

## Requisito Obligatorio
Siempre que agregues, edites o uses un nuevo icono de Lucide en un archivo de plantilla HTML (`*.html`):
1. **Importa** el icono en el archivo TypeScript del componente correspondiente (`*.ts`):
   ```typescript
   import { ChevronDown, Star, Diamond } from 'lucide-angular';
   ```
2. **Declara** el icono como una propiedad de lectura de la clase (`readonly`):
   ```typescript
   export class MyComponent {
     readonly ChevronDown = ChevronDown;
     readonly Star = Star;
     readonly Diamond = Diamond;
   }
   ```

## Lo que se debe evitar (Anti-patterns)
- Evitar usar nombres de iconos en las plantillas HTML (ej. `[name]="Diamond"`) si la propiedad `Diamond` no está definida en la clase del componente. Esto detendrá inmediatamente la compilación en el paso de generación del bundle.
