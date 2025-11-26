#!/bin/bash

# Script pour s'assurer que Node.js est disponible dans le PATH pour Gradle

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ajouter Node.js au PATH
export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"

# Exécuter la commande Gradle avec le bon environnement
exec ./gradlew "$@"
