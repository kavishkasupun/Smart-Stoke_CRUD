import { useState, useCallback, useRef } from 'react';
import { collection, query, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * A hook to handle Firestore pagination for collections.
 * 
 * @param {string} collectionName - Name of the collection
 * @param {number} pageSize - Number of items per page
 * @param {function} queryBuilder - A function that returns a Query with orderBys/wheres (without limit or startAfter)
 */
export function useFirestorePagination(collectionName, pageSize = 20, queryBuilder = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const lastDocRef = useRef(null);

  const fetchNextPage = useCallback(async (reset = false) => {
    if (!reset && (!hasMore || loading)) return;
    
    setLoading(true);
    setError(null);

    try {
      let baseQuery;
      if (queryBuilder) {
        baseQuery = queryBuilder();
      } else {
        baseQuery = collection(db, collectionName);
      }

      let q;
      if (reset || !lastDocRef.current) {
        q = query(baseQuery, limit(pageSize));
      } else {
        q = query(baseQuery, startAfter(lastDocRef.current), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (reset) {
        setData(newItems);
      } else {
        setData(prev => [...prev, ...newItems]);
      }

      if (snapshot.docs.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }
    } catch (err) {
      console.error('Pagination error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, pageSize, queryBuilder, hasMore, loading]);

  const reset = useCallback(() => {
    lastDocRef.current = null;
    setHasMore(true);
    setData([]);
    return fetchNextPage(true);
  }, [fetchNextPage]);

  return {
    data,
    loading,
    hasMore,
    error,
    fetchNextPage,
    reset,
    setData // Expose setter to allow optimistic updates
  };
}
