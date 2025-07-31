> O platformă web educațională construită cu Next.js + TypeScript, care ajută utilizatorii să învețe să deseneze portrete pas cu pas. Aplicația oferă un canvas interactiv (Fabric.js), modele 3D ale capului (Three.js), autentificare și conținut dinamic gestionat prin Supabase.

---

## Tehnologii principale

- **Next.js** – Framework React cu routing și SSR
- **TypeScript** – Tipare stricte pentru dezvoltare sigură
- **Fabric.js** – Canvas interactiv pentru desen în browser
- **Three.js** – Redare 3D a capului uman pentru studiu volumetric
- **Supabase** – Bază de date, CMS și autentificare user-friendly

---

## Funcționalități

-  Lecții pas cu pas pentru desenarea portretului
-  Canvas interactiv (trasează, desenează, șterge, exportă)
-  Model 3D rotativ al capului uman (pentru studiu proporții)
-  Autentificare: email + parola (via Supabase)
-  CMS: lecții stocate și gestionate în Supabase (titlu, descriere, imagine, etc.)
-  Salvarea desenelor + progresul utilizatorului
-  Design responsive, modern (TailwindCSS)

---

## Instalare locală

### 1. Clonează proiectul
```bash
git clone https://github.com/numele-tau/portretify.git
cd portretedu
```
2. Instalează dependențele
```bash
npm install
```

3. Configurează variabilele de mediu
```
Creează un fișier .env.local:
```

## Lecții (CMS cu Supabase)

Lecțiile pot fi editate din Supabase Table Editor sau prin CMS-ul disponibil in /admin

## Autentificare (via Supabase)
## Desen cu Fabric.js
### Funcții incluse:
 - Desen liber cu mouse/touch/tableta grafica
 - Ștergere / reset
 - Salvare ca .png

## Model 3D cap – Three.js
  - Model .glb încărcat cu @react-three/fiber și @react-three/drei
  - Control orbit (rotire, zoom)
  - Util pentru înțelegerea volumelor craniului și proporțiilor
