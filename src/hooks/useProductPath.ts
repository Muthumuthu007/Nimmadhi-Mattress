import {useMemo} from 'react';
import {useProducts} from '../contexts/ProductContext';
import {createProductPathResolver} from '../utils/productListing';
export function useProductPath(){const {groupedProducts}=useProducts();return useMemo(()=>createProductPathResolver(groupedProducts),[groupedProducts]);}
