# Material sursă

Ce e aici nu se execută și nu se mai modifică.

**`prototip-v7.jsx`** — prototipul de interfață, așa cum a fost testat înainte de
portare. A fost mutat în `src/components/Vocal.jsx`, care e de acum singurul loc
unde se schimbă interfața. Fișierul de aici rămâne doar ca să se poată vedea de
unde s-a plecat.

Ce s-a schimbat la portare:

- toate datele vin de la server; nimic nu mai e simulat în pagină;
- playerele folosesc fișiere audio adevărate, prin linkuri semnate;
- ecranul de documente legale a fost scos — textele au pagini proprii,
  generate din `content/legal/`, deschise în filă nouă ca să nu se piardă
  formularul completat;
- **textele legale din prototip erau versiunea veche** și spuneau altceva decât
  documentele valabile: livrare în 5–10 minute după plată și „toate vânzările
  sunt finale", fără previzualizare gratuită. Au plecat odată cu ecranul.
