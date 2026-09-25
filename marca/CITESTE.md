# Semnătura sonoră

Aici se pune sunetul care se aude peste melodia gratuită, din treizeci în
treizeci de secunde. Fișierele pe care clientul le primește după plată nu îl au.

Fișierul se numește **`marca.mp4`** și stă doar pe server, nu în depozitul de
cod. Două motive:

- e un fișier personal, iar depozitul e public;
- se poate schimba fără să reconstruiești nimic — pui altul și repornești
  worker-ul.

## Cum îl pui

De pe calculatorul tău, într-un PowerShell:

```
scp "CALEA\CATRE\SUNET.mp4" root@194.33.42.212:/root/vocal-md/marca/marca.mp4
```

Apoi, pe server:

```
cd /root/vocal-md && docker compose restart worker
```

Merge orice format pe care îl citește ffmpeg: `.mp4`, `.m4a`, `.mp3`, `.wav`.
Dacă pui altă extensie, schimbă și `WATERMARK_FILE` în `.env`.

## Dacă fișierul lipsește

Nu se strică nimic: se face automat vechea previzualizare de 60 de secunde,
iar worker-ul scrie în jurnal de ce. Scade doar la ce era înainte.

## Cum îl reglezi

```
npm run marca
```

Face o melodie falsă, pune marca peste ea exact cum o pune worker-ul, și lasă
fișierul de ascultat. Dacă se aude prea tare sau prea încet, schimbi
`WATERMARK_VOLUME` în `.env` și rulezi iar. Se reglează cu urechea, nu din
calcul.
