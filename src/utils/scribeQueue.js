import { get, set, update } from 'idb-keyval';

const QUEUE_KEY = 'scribe_offline_queue';

/**
 * Adds a text request to the offline queue.
 * @param {string} text - The Scribe input text.
 */
export const addToQueue = async (text) => {
    await update(QUEUE_KEY, (val) => {
        const queue = val || [];
        queue.push({ text, timestamp: new Date().toISOString(), status: 'pending' });
        return queue;
    });
};

/**
 * Retrieves the current queue.
 * @returns {Promise<Array>}
 */
export const getQueue = async () => {
    return (await get(QUEUE_KEY)) || [];
};

/**
 * Clears the queue.
 */
export const clearQueue = async () => {
    await set(QUEUE_KEY, []);
};

/**
 * Removes a specific item from the queue by index.
 * @param {number} index 
 */
export const removeFromQueue = async (index) => {
    await update(QUEUE_KEY, (val) => {
        const queue = val || [];
        return queue.filter((_, i) => i !== index);
    });
};
