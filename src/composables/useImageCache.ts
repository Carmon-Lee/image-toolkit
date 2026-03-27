import { ref } from 'vue'
import type { ImageFile } from '../types'

const DB_NAME = 'image-toolkit-cache'
const DB_VERSION = 1
const STORE_NAME = 'images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function saveImageToDB(image: ImageFile): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // Convert File to base64 for storage
    const reader = new FileReader()
    reader.onload = () => {
      const imageData = {
        id: image.id,
        name: image.name,
        url: reader.result as string, // base64 data URL
        width: image.width,
        height: image.height,
        fileType: image.file?.type || 'image/png',
        timestamp: Date.now(),
      }
      const request = store.put(imageData)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    }
    reader.onerror = () => reject(reader.error)
    
    if (image.file) {
      reader.readAsDataURL(image.file)
    } else {
      // If no file, convert existing URL to data URL
      fetch(image.url)
        .then(res => res.blob())
        .then(blob => {
          reader.readAsDataURL(blob)
        })
    }
  })
}

async function getAllImagesFromDB(): Promise<ImageFile[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const results = request.result.map((item: any) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        width: item.width,
        height: item.height,
        fileType: item.fileType,
      }))
      resolve(results)
    }
  })
}

async function clearImageFromDB(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export function useImageCache() {
  const cachedImages = ref<ImageFile[]>([])
  const isLoading = ref(false)

  async function loadCachedImages(): Promise<ImageFile[]> {
    isLoading.value = true
    try {
      const images = await getAllImagesFromDB()
      cachedImages.value = images
      return images
    } catch (error) {
      console.error('Failed to load cached images:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function cacheImage(image: ImageFile): Promise<void> {
    try {
      await saveImageToDB(image)
      // Update cached images list
      const existingIndex = cachedImages.value.findIndex(img => img.id === image.id)
      if (existingIndex >= 0) {
        cachedImages.value[existingIndex] = image
      } else {
        cachedImages.value.push(image)
      }
    } catch (error) {
      console.error('Failed to cache image:', error)
    }
  }

  async function removeFromCache(id: string): Promise<void> {
    try {
      await clearImageFromDB(id)
      cachedImages.value = cachedImages.value.filter(img => img.id !== id)
    } catch (error) {
      console.error('Failed to remove image from cache:', error)
    }
  }

  async function clearAllCache(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        cachedImages.value = []
        resolve()
      }
    })
  }

  return {
    cachedImages,
    isLoading,
    loadCachedImages,
    cacheImage,
    removeFromCache,
    clearAllCache,
  }
}
