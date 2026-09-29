#!/usr/bin/env python3
"""Extrae la tabla "Respuestas Correctas" del PDF y la guarda en tools/clave_pdf.json.

Uso:
    python3 -m pip install pypdf      # una sola vez (o pymupdf)
    python3 tools/extraer_clave_pdf.py "ruta/ADM Test C (práctica).pdf"

La tabla del PDF tiene tres columnas (Cuantitativa 1-20, Lúdica 1-12,
Verbal 1-17) que el texto extraído entrega intercaladas por filas:
"1 D 1 E 1 C 2 D ...". Cada par (número, letra) se asigna a la primera
sección cuyo próximo número esperado coincide.
"""
import json
import re
import sys
from pathlib import Path

SECCIONES = [("cuantitativo", 20), ("ludico", 12), ("verbal", 17)]


def texto_ultima_pagina_con_clave(ruta):
    paginas = []
    try:
        import fitz  # pymupdf
        doc = fitz.open(ruta)
        paginas = [p.get_text() for p in doc]
    except ImportError:
        from pypdf import PdfReader
        paginas = [p.extract_text() or "" for p in PdfReader(ruta).pages]
    for t in reversed(paginas):
        if "Respuestas Correctas" in t:
            return t
    raise SystemExit("No se encontró la página 'Respuestas Correctas' en el PDF.")


def parsear(texto):
    cuerpo = texto.split("Respuestas Correctas", 1)[1]
    tokens = re.findall(r"\b(\d{1,2}|[A-E])\b", cuerpo)
    pares = []
    i = 0
    while i < len(tokens) - 1:
        if tokens[i].isdigit() and re.fullmatch(r"[A-E]", tokens[i + 1]):
            pares.append((int(tokens[i]), tokens[i + 1]))
            i += 2
        else:
            i += 1
    clave = {s: [] for s, _ in SECCIONES}
    for n, letra in pares:
        for s, total in SECCIONES:
            if len(clave[s]) < total and len(clave[s]) + 1 == n:
                clave[s].append(letra)
                break
        else:
            raise SystemExit(f"Par inesperado en la tabla: {n} {letra}")
    for s, total in SECCIONES:
        if len(clave[s]) != total:
            raise SystemExit(f"{s}: se extrajeron {len(clave[s])} respuestas, se esperaban {total}")
    return clave


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    clave = parsear(texto_ultima_pagina_con_clave(sys.argv[1]))
    salida = Path(__file__).with_name("clave_pdf.json")
    salida.write_text(json.dumps({"fuente": Path(sys.argv[1]).name, **clave}, ensure_ascii=False, indent=2) + "\n")
    for s, _ in SECCIONES:
        print(f"{s:13s} {''.join(clave[s])}")
    print(f"Guardado en {salida}")


if __name__ == "__main__":
    main()
