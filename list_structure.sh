#!/bin/bash

echo "=== STRUCTURE DU PROJET ==="
echo "Généré le: $(date)"
echo "Répertoire: $(pwd)"
echo ""

find . -type d \( \
    -name node_modules -o \
    -name .git -o \
    -name dist -o \
    -name build -o \
    -name coverage -o \
    -name .next -o \
    -name __pycache__ -o \
    -name venv -o \
    -name env -o \
    -name .venv \
\) -prune -o -print | sort > structure.txt

cat structure.txt
echo ""
echo "Fichiers trouvés: $(wc -l < structure.txt)"
echo "Structure sauvegardée dans: structure.txt"