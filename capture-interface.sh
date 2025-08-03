#!/bin/bash

echo "📸 Capture de l'interface IPTV Smarters Pro"
echo "=========================================="

# 1. S'assurer que l'app est au premier plan
echo "🚀 Lancement de l'application..."
adb shell am start -n com.iptvmobileapp/.MainActivity
sleep 4

# 2. Prendre une capture d'écran
echo "📸 Capture d'écran en cours..."
adb shell screencap -p /sdcard/iptv_interface.png

# 3. Récupérer la capture
echo "📁 Récupération de la capture..."
adb pull /sdcard/iptv_interface.png /home/joel/projets-iptv/screenshot/

# 4. Nettoyer l'appareil
adb shell rm /sdcard/iptv_interface.png

# 5. Afficher le résultat
if [ -f "/home/joel/projets-iptv/screenshot/iptv_interface.png" ]; then
    echo "✅ Capture sauvegardée: /home/joel/projets-iptv/screenshot/iptv_interface.png"
    
    # Vérifier la taille du fichier pour s'assurer qu'elle est valide
    SIZE=$(stat -c%s "/home/joel/projets-iptv/screenshot/iptv_interface.png")
    echo "📊 Taille du fichier: $SIZE octets"
    
    if [ $SIZE -gt 10000 ]; then
        echo "🎯 Capture réussie ! Vous pouvez maintenant voir l'interface:"
        echo "   - TV EN DIRECT (grande carte bleue)"
        echo "   - FILMS (carte orange)"  
        echo "   - SERIES (carte gris/bleu)"
        echo "   - LIVE EPG, MULTI-ÉCR, RATTRAPER (petites cartes vertes)"
    else
        echo "⚠️ La capture semble trop petite, vérifiez l'interface manuellement"
    fi
else
    echo "❌ Erreur: impossible de récupérer la capture"
fi

echo "=========================================="