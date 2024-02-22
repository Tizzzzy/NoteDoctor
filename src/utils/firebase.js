import { set } from "date-fns";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyCsVo2H8mKsXh6iiuZtoo7Hnz1Xigp0ScY",
  authDomain: "notedoctor-d96e7.firebaseapp.com",
  projectId: "notedoctor-d96e7",
  storageBucket: "notedoctor-d96e7.appspot.com",
  messagingSenderId: "1053079986503",
  appId: "1:1053079986503:web:8bc20717f73a9288fdec62",
  measurementId: "G-E2E401FCH5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export const getPatient = async (uuid) => {
  const docRef = doc(db, "patients", uuid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    return docSnap.data();
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
};

export const checkIn = async (uuid, apptref) => {
  const docRoom = doc(db, "rooms", uuid);
  const docSnap = await getDoc(docRoom);
  if (docSnap.exists()) {
    setDoc(docRoom, { appointment: apptref }, { merge: true });
    return true;
  } else {
    console.log("Wrong Code!");
    return false;
  }
};

export const checkOut = async (uuid) => {
  const docRoom = doc(db, "rooms", uuid);
  setDoc(docRoom, { appointment: null }, { merge: true });
};

export const getAppt = async (uuid) => {
  const docRef = doc(db, "appointments", uuid);
  const docSnap = await getDoc(docRef);
  let result = {};

  if (docSnap.exists()) {
    result = { ...docSnap.data() };
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }

  result.ref = docSnap.ref;
  const patSnap = await getDoc(docSnap.data().patient);
  // take patient data to result instead of pointer
  result.patient = patSnap.data();
  console.log("Document data:", result);
  return result;
};

export const getCareGiver = async (uuid) => {
  const docRef = doc(db, "caregivers", uuid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    return docSnap.data();
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
};

export const useRealTimeDoc = (docPathArray) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    console.log("useRealTimeDoc", docPathArray);
    const unsub = onSnapshot(doc(db, ...docPathArray), (doc) => {
      console.log("useRealTimeDoc", { ...doc.data(), id: doc.id });
      setData({ ...doc.data(), id: doc.id });
    });
    return () => unsub();
  }, []);
  return data;
};

export const useRealTimeCollection = (
  collectionPathArray,
  whereArr,
  sortArr,
) => {
  const [data, setData] = useState([]);
  useEffect(() => {
    const addOns = [];
    if (whereArr) {
      addOns.push(where(...whereArr));
    }
    if (sortArr) {
      addOns.push(orderBy(...sortArr));
    }
    const q = query(collection(db, ...collectionPathArray), ...addOns);
    const unsub = onSnapshot(q, (querySnapshot) => {
      setData(querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsub();
  }, []);
  return data;
};

export const useRealtimeAppointments = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("date"));
    const unsub = onSnapshot(q, async (querySnapshot) => {
      const appts = [];
      for (const doc of querySnapshot.docs) {
        const patSnap = await getDoc(doc.data().patient);
        appts.push({ ...doc.data(), id: doc.id, patient: patSnap.data() });
      }
      setData(appts);
    });
    return () => unsub();
  }, []);
  return data;
};

export const useRealtimeRoom = (roomId) => {
  const [data, setData] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "rooms", roomId), async (doc) => {
      const data = doc.data();
      const apptData = (await getDoc(data.appointment)).data();
      const patData = (await getDoc(apptData.patient)).data();
      const careData = [];
      for (const careRef of apptData.caregivers) {
        const tempCareData = (await getDoc(careRef)).data();
        careData.push(tempCareData);
      }
      const res = {
        ...data,
        id: doc.id,
        appointment: { ...apptData, patient: patData, caregivers: careData },
      };
      console.log("useRealtimeRoom", res);
      setData(res);
    });
    return () => unsub();
  }, []);
  return data;
};
