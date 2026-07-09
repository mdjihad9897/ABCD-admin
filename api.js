/* ==========================================================================
   FLEXIBLE BACKEND LAYER SYSTEM (API BRIDGE ARCHITECTURE)
   ========================================================================== */
/**
 * এই api.js ফাইলটি ফ্রন্টএন্ড এবং ব্যাকএন্ডের মধ্যে একটি নিরাপদ সেতু (Bridge Layer) হিসেবে কাজ করে।
 * বর্তমানে এটি Firebase (Free Version) দিয়ে কনফিগার করা হয়েছে। 
 * ভবিষ্যতে PHP + MySQL-এ মাইগ্রেশন করতে হলে ফ্রন্টএন্ডের কোথাও হাত দিতে হবে না,
 * শুধুমাত্র এই ফাইলের মেথডগুলোর ভেতরের লজিক পরিবর্তন করলেই পুরো সিস্টেম বদলে যাবে।
 */

const API = {
    // ----------------------------------------------------------------------
    // AUTHENTICATION MODULE (Firebase Ready / PHP Migratable)
    // ----------------------------------------------------------------------
    auth: {
        async login(phone, password) {
            // Firebase implementation fallback wrapper
            if (typeof firebase !== 'undefined' && firebase.auth) {
                return await FirebaseAdapter.auth.login(phone, password);
            }
            
            // Native Mock Simulation (Failsafe for development mode)
            return new Promise((resolve) => {
                setTimeout(() => {
                    if (phone === "01712345678" && password === "123456") {
                        resolve({
                            success: true,
                            user: { id: "usr_mock_1", name: "টেস্ট ইউজার", phone: phone }
                        });
                    } else {
                        resolve({ success: false, message: "ভুল মোবাইল নম্বর অথবা পাসওয়ার্ড!" });
                    }
                }, 800);
            });
        },

        async register(userData) {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                return await FirebaseAdapter.auth.register(userData);
            }

            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        user: { id: "usr_mock_" + Date.now(), name: userData.name, phone: userData.phone }
                    });
                }, 800);
            });
        }
    },

    // ----------------------------------------------------------------------
    // PRODUCTS MANAGEMENT DATABASES MODULE
    // ----------------------------------------------------------------------
    products: {
        async getAll() {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                return await FirebaseAdapter.firestore.getCollection('products');
            }

            // Fallback direct resolve logic trigger to script.js simulation
            return new Promise((resolve) => {
                setTimeout(() => resolve(null), 300); // Triggers network fallback state
            });
        },

        async getById(productId) {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                return await FirebaseAdapter.firestore.getDocument('products', productId);
            }
            return null;
        }
    },

    // ----------------------------------------------------------------------
    // CATEGORIES MODULE
    // ----------------------------------------------------------------------
    categories: {
        async getAll() {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                return await FirebaseAdapter.firestore.getCollection('categories');
            }
            return null;
        }
    },

    // ----------------------------------------------------------------------
    // DYNAMIC BANNER CAROUSEL MODULE
    // ----------------------------------------------------------------------
    banners: {
        async getAll() {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                return await FirebaseAdapter.firestore.getCollection('banners');
            }
            return null;
        }
    }
};

/* ==========================================================================
   FIREBASE REAL-TIME SYNC & ORDERS ENGINE (CONTINUATION)
   ========================================================================== */

// API অবজেক্টের বাকি মডিউলগুলো এখানে যুক্ত করা হলো
Object.assign(API, {
    // ----------------------------------------------------------------------
    // ORDERS PROCESSING MODULE
    // ----------------------------------------------------------------------
    orders: {
        async create(orderPayload) {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                try {
                    const db = firebase.firestore();
                    const orderRef = await db.collection('orders').add(orderPayload);
                    return { success: true, orderId: orderRef.id };
                } catch (error) {
                    console.error("Firebase Order Placement Error: ", error);
                    return { success: false, error };
                }
            }

            // Mock Implementation (PHP/MySQL এ বদলানো যাবে সহজে)
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        orderId: "ORD" + Math.floor(100000 + Math.random() * 900000)
                    });
                }, 1200);
            });
        }
    },

    // ----------------------------------------------------------------------
    // REAL-TIME SUPPORT CHAT MODULE (Firebase Realtime Database)
    // ----------------------------------------------------------------------
    chat: {
        listenToChannel(userId, callback) {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const chatRef = firebase.database().ref(`chats/${userId}`);
                
                // Real-time Event Listener Attachment
                chatRef.on('value', (snapshot) => {
                    const data = snapshot.val();
                    const messagesArray = [];
                    if (data) {
                        Object.keys(data).forEach(key => {
                            messagesArray.push(data[key]);
                        });
                    }
                    // Sort messages by timestamp sequentially
                    messagesArray.sort((a, b) => a.timestamp - b.timestamp);
                    callback(messagesArray);
                });

                // Return Unsubscribe Closure Method to prevent Memory Leaks
                return () => chatRef.off();
            }

            // Mock Poll Fallback Mode
            console.warn("Firebase Live Chat disabled. Mock Stream active.");
            const mockInterval = setInterval(() => {
                callback([
                    { senderId: "admin", text: "হ্যালো! প্রিমিয়াম ই-শপ সাপোর্টে আপনাকে স্বাগতম। আমরা কীভাবে সাহায্য করতে পারি?", timestamp: Date.now() - 5000 }
                ]);
            }, 2000);

            return () => clearInterval(mockInterval);
        },

        async sendMessage(userId, messagePayload) {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const chatRef = firebase.database().ref(`chats/${userId}`);
                return await chatRef.push(messagePayload);
            }

            return new Promise((resolve) => {
                setTimeout(() => resolve({ success: true }), 100);
            });
        }
    }
});

/* ==========================================================================
   FIREBASE INTERFACE ADAPTER LAYER (Structural Normalizer Engine)
   ========================================================================== */
const FirebaseAdapter = {
    auth: {
        async login(phone, password) {
            try {
                // Firebase-এ ইমেইল ফরম্যাট স্ট্যান্ডার্ড হওয়ায় মোবাইল নম্বরকে ইন্টারনাল ইমেইলে ম্যাপ করা হলো
                const fakeEmail = `${phone}@premium-eshop.com`;
                const userCredential = await firebase.auth().signInWithEmailAndPassword(fakeEmail, password);
                
                // Firestore থেকে ইউজারের প্রোফাইল মেটাডাটা রিট্রিভ করা হচ্ছে
                const userDoc = await firebase.firestore().collection('users').doc(userCredential.user.uid).get();
                return {
                    success: true,
                    user: { id: userCredential.user.uid, ...userDoc.data() }
                };
            } catch (error) {
                return { success: false, message: error.message };
            }
        },

        async register(userData) {
            try {
                const fakeEmail = `${userData.phone}@premium-eshop.com`;
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(fakeEmail, userData.password);
                
                const profile = { name: userData.name, phone: userData.phone, createdAt: new Date().toISOString() };
                
                // Firestore-এ ইউজার রেকর্ড সিঙ্ক ও সেভ করা হচ্ছে
                await firebase.firestore().collection('users').doc(userCredential.user.uid).set(profile);
                
                return {
                    success: true,
                    user: { id: userCredential.user.uid, ...profile }
                };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },

    firestore: {
        async getCollection(collectionName) {
            try {
                const snapshot = await firebase.firestore().collection(collectionName).get();
                const dataArray = [];
                snapshot.forEach(doc => {
                    dataArray.push({ id: doc.id, ...doc.data() });
                });
                return dataArray;
            } catch (error) {
                console.error(`Firestore fetch error on ${collectionName}: `, error);
                return null;
            }
        },

        async getDocument(collectionName, docId) {
            try {
                const doc = await firebase.firestore().collection(collectionName).doc(docId).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            } catch (error) {
                console.error(`Firestore fetch document error: `, error);
                return null;
            }
        }
    }
};