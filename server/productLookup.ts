/**
 * Product Lookup Service
 * 
 * Uses free APIs to search for product information by barcode
 */

interface ProductInfo {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  success: boolean;
  source?: string;
}

/**
 * Search for product information using Open Food Facts API (free)
 * Enhanced to search multiple name fields and better image selection
 */
async function searchOpenFoodFacts(barcode: string): Promise<ProductInfo> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      // Try multiple name fields for better coverage
      const name = product.product_name || 
                  product.product_name_en || 
                  product.product_name_fr || 
                  product.product_name_es || 
                  product.abbreviated_product_name ||
                  product.generic_name || 
                  product.generic_name_en;
      
      // Try multiple description fields
      const description = product.generic_name || 
                         product.generic_name_en || 
                         product.ingredients_text_en || 
                         product.ingredients_text;
      
      // Better image selection
      const imageUrl = product.image_front_url || 
                      product.image_url || 
                      product.image_front_small_url ||
                      (product.selected_images && product.selected_images.front && product.selected_images.front.display && product.selected_images.front.display.en);
      
      if (name) {
        return {
          name: name.trim(),
          description: description ? description.trim() : undefined,
          brand: product.brands,
          category: product.categories || product.categories_tags?.[0],
          imageUrl: imageUrl,
          success: true,
          source: 'Open Food Facts'
        };
      }
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using UPC Database API (free)
 */
async function searchUPCDatabase(barcode: string): Promise<ProductInfo> {
  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const data = await response.json();
    
    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
        success: true,
        source: 'UPC Database'
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using Barcode Spider API (free)
 */
async function searchBarcodeSpider(barcode: string): Promise<ProductInfo> {
  try {
    const response = await fetch(`https://api.barcodespider.com/v1/lookup?token=free&upc=${barcode}`);
    const data = await response.json();
    
    if (data.item_response && data.item_response.message === 'success') {
      const item = data.item_response.item_attributes;
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.image,
        success: true,
        source: 'Barcode Spider'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Search for product information using Barcode Lookup API (free)
 */
async function searchBarcodeLookup(barcode: string): Promise<ProductInfo> {
  try {
    const response = await fetch(`https://www.barcodelookup.com/${barcode}`);
    const text = await response.text();
    
    // Parse HTML to extract product information
    const nameMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const imageMatch = text.match(/<meta property="og:image" content="([^"]+)"/i);
    const descMatch = text.match(/<meta property="og:description" content="([^"]+)"/i);
    
    if (nameMatch && nameMatch[1]) {
      return {
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : undefined,
        imageUrl: imageMatch ? imageMatch[1].trim() : undefined,
        success: true,
        source: 'Barcode Lookup'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Search for product information using EAN Search API (free)
 */
async function searchEANSearch(barcode: string): Promise<ProductInfo> {
  try {
    const response = await fetch(`https://www.ean-search.org/api?op=barcode-lookup&format=json&ean=${barcode}`);
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].name) {
      const product = data[0];
      return {
        name: product.name,
        description: product.description,
        category: product.categoryText,
        imageUrl: product.image,
        success: true,
        source: 'EAN Search'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Main function to lookup product information by barcode
 * Tries multiple free APIs in sequence with expanded search range
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductInfo> {
  // Clean the barcode (remove any non-numeric characters)
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  if (!cleanBarcode || cleanBarcode.length < 8) {
    return { success: false };
  }
  
  // Try different barcode formats if original doesn't work
  const barcodeVariants = [
    cleanBarcode,
    // Add leading zeros for UPC-A format (12 digits)
    cleanBarcode.length === 11 ? '0' + cleanBarcode : null,
    // Try without leading zeros for EAN-13 format
    cleanBarcode.startsWith('0') && cleanBarcode.length === 13 ? cleanBarcode.substring(1) : null,
    // Try both with and without check digit
    cleanBarcode.length > 8 ? cleanBarcode.substring(0, cleanBarcode.length - 1) : null
  ].filter(Boolean) as string[];
  
  // Try each API in order - expanded range of sources
  const apis = [
    searchOpenFoodFacts,
    searchUPCDatabase,
    searchEANSearch,
    searchBarcodeSpider,
    searchBarcodeLookup
  ];
  
  // Try each barcode variant with each API for maximum coverage
  for (const barcodeVariant of barcodeVariants) {
    for (const api of apis) {
      try {
        const result = await api(barcodeVariant);
        if (result.success) {
          return result;
        }
      } catch (error) {
        // Continue to next API/variant combination
        continue;
      }
    }
  }
  
  return { success: false };
}