#!/usr/bin/env bash
set -e

# ==============================================================================
# Script Otomatisasi Update & Redeployment E-Learning (Single VPS)
# Spring Boot 3 + React Vite + PostgreSQL + Redis
# ==============================================================================

# Pastikan eksekusi berjalan di root direktori project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"

# Pewarnaan output terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN} 🚀 E-Learning Deployment Script (Git Pull & Docker) ${NC}"
echo -e "${CYAN}=====================================================${NC}"

TARGET_SERVICE=""
NO_CACHE=false

# Parsing argumen baris perintah
for arg in "$@"; do
    case "$arg" in
        frontend|backend|postgres|redis)
            TARGET_SERVICE="$arg"
            ;;
        --no-cache)
            NO_CACHE=true
            ;;
        --help|-h)
            echo "Penggunaan: ./deploy.sh [SERVICE] [--no-cache]"
            echo ""
            echo "Pilihan Service:"
            echo "  (kosong)          Build dan perbarui seluruh service (Frontend & Backend)"
            echo "  frontend          Hanya perbarui dan build ulang kontainer React Frontend"
            echo "  backend           Hanya perbarui dan build ulang kontainer Spring Boot Backend"
            echo "  postgres          Hanya restart kontainer PostgreSQL"
            echo "  redis             Hanya restart kontainer Redis"
            echo ""
            echo "Opsi Flag:"
            echo "  --no-cache        Build image Docker tanpa menggunakan layer cache"
            echo "  --help, -h        Tampilkan menu bantuan ini"
            echo ""
            echo "Contoh:"
            echo "  ./deploy.sh                      # Update standar semua service"
            echo "  ./deploy.sh frontend             # Hanya update tampilan frontend"
            echo "  ./deploy.sh backend --no-cache   # Update backend bersih tanpa cache"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Argumen tidak dikenal: $arg${NC}"
            echo "Jalankan './deploy.sh --help' untuk melihat daftar perintah yang tersedia."
            exit 1
            ;;
    esac
done

# 1. Tarik Perubahan Kode Terbaru dari Git
echo -e "\n${YELLOW}📥 [1/4] Menarik perubahan kode terbaru dari Git...${NC}"
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "   Branch saat ini: ${CYAN}${CURRENT_BRANCH}${NC}"
    git pull origin "$CURRENT_BRANCH" || {
        echo -e "${RED}❌ Gagal melakukan git pull. Periksa koneksi atau perubahan lokal.${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}⚠️  Direktori bukan git repository aktif, melewati langkah git pull.${NC}"
fi

# 2. Build Docker Image
echo -e "\n${YELLOW}📦 [2/4] Melakukan build image Docker...${NC}"
BUILD_ARGS=()
if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS+=("--no-cache")
    echo -e "${YELLOW}ℹ️  Mode --no-cache diaktifkan (build bersih dari awal).${NC}"
fi

if [ -n "$TARGET_SERVICE" ]; then
    echo -e "${CYAN}🔧 Membangun service spesifik: ${TARGET_SERVICE}...${NC}"
    docker compose -f "$COMPOSE_FILE" build "${BUILD_ARGS[@]}" "$TARGET_SERVICE"
    
    echo -e "\n${YELLOW}🔄 [3/4] Menerapkan kontainer baru (${TARGET_SERVICE})...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps "$TARGET_SERVICE"
else
    echo -e "${CYAN}🔧 Membangun seluruh service aplikasi...${NC}"
    docker compose -f "$COMPOSE_FILE" build "${BUILD_ARGS[@]}"
    
    echo -e "\n${YELLOW}🔄 [3/4] Menerapkan dan memperbarui kontainer...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
fi

# 3. Bersihkan Docker Dangling Images
echo -e "\n${YELLOW}🧹 [4/4] Membersihkan image lama yang tidak terpakai (prune)...${NC}"
docker image prune -f

# 4. Verifikasi Status Kesehatan Kontainer
echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN} ✅ Status Kontainer Saat Ini:${NC}"
echo -e "${GREEN}=====================================================${NC}"
sleep 2
docker compose -f "$COMPOSE_FILE" ps

echo -e "\n${CYAN}💡 Perintah Pemantauan Lanjutan:${NC}"
echo -e "  - Log Backend  : docker compose -f $COMPOSE_FILE logs -f backend"
echo -e "  - Log Frontend : docker compose -f $COMPOSE_FILE logs -f frontend"
echo -e "  - Health Check : curl -s http://127.0.0.1:8088/actuator/health"
echo -e "${GREEN}🎉 Deployment selesai dan aplikasi berhasil diperbarui!${NC}\n"
