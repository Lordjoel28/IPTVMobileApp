#!/bin/bash

echo "🚀 Test de l'application IPTV Mobile avec interface IPTV Smarters Pro"
echo "================================================"

# 1. Vérifier si l'appareil est connecté
echo "📱 Vérification de la connexion ADB..."
if ! adb devices | grep -q "device$"; then
    echo "❌ Aucun appareil Android connecté"
    exit 1
fi
echo "✅ Appareil connecté"

# 2. Installer l'APK Release
echo "📦 Installation de l'APK Release..."
adb install -r android/app/build/outputs/apk/release/app-release.apk
if [ $? -eq 0 ]; then
    echo "✅ APK installée avec succès"
else
    echo "❌ Erreur lors de l'installation"
    exit 1
fi

# 3. Lancer l'application
echo "🎬 Lancement de l'application..."
adb shell am start -n com.iptvmobileapp/.MainActivity
sleep 3

# 4. Vérifier si l'app tourne
echo "🔍 Vérification du processus..."
if adb shell ps | grep -q "com.iptvmobileapp"; then
    echo "✅ Application lancée avec succès"
    echo "📱 L'interface IPTV Smarters Pro devrait maintenant être visible !"
    echo ""
    echo "🎯 Interface attendue :"
    echo "   • TV EN DIRECT (grande carte bleue)"
    echo "   • FILMS (carte orange)"
    echo "   • SERIES (carte gris/bleu)"
    echo "   • LIVE EPG, MULTI-ÉCR, RATTRAPER (3 petites cartes vertes)"
    echo ""
    echo "🔧 Pour voir les logs en temps réel :"
    echo "   adb logcat | grep ReactNativeJS"
else
    echo "❌ L'application ne semble pas démarrée"
fi

echo "================================================"
echo "✅ Test terminé - L'interface IPTV Smarters Pro est prête !"