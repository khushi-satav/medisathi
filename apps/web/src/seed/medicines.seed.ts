import mongoose from 'mongoose';

// Define Medicine schema locally for seeding if not found
const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String, required: true },
  brandNames: [String],
  drugClass: { type: String, required: true },
  activeIngredient: { type: String, required: true },
  dosageForms: [String],
  standardDosages: [String],
  indications: [String],
  sideEffects: [String],
  foodInteractions: [String],
  imageUrl: String,
});

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);

const sampleMedicines = [
  {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    brandNames: ["Tylenol", "Panadol", "Crocin"],
    drugClass: "Analgesic, Antipyretic",
    activeIngredient: "Acetaminophen",
    dosageForms: ["TABLET", "LIQUID", "INJECTION"],
    standardDosages: ["500mg", "650mg"],
    indications: ["Fever", "Mild to moderate pain", "Headache"],
    sideEffects: ["Nausea", "Liver damage (in high doses)", "Rash"],
    foodInteractions: ["Alcohol (increases risk of liver damage)"],
    imageUrl: "https://example.com/paracetamol.jpg"
  },
  {
    name: "Metformin",
    genericName: "Metformin Hydrochloride",
    brandNames: ["Glucophage", "Fortamet", "Glumetza"],
    drugClass: "Biguanide (Antidiabetic)",
    activeIngredient: "Metformin",
    dosageForms: ["TABLET"],
    standardDosages: ["500mg", "850mg", "1000mg"],
    indications: ["Type 2 Diabetes"],
    sideEffects: ["Diarrhea", "Nausea", "Stomach pain", "Vitamin B12 deficiency"],
    foodInteractions: ["Alcohol (increases risk of lactic acidosis)"],
    imageUrl: "https://example.com/metformin.jpg"
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    brandNames: ["Amoxil", "Moxatag", "Trimox"],
    drugClass: "Penicillin Antibiotic",
    activeIngredient: "Amoxicillin",
    dosageForms: ["CAPSULE", "LIQUID", "TABLET"],
    standardDosages: ["250mg", "500mg"],
    indications: ["Bacterial infections", "Pneumonia", "Bronchitis"],
    sideEffects: ["Nausea", "Vomiting", "Diarrhea", "Rash"],
    foodInteractions: [],
    imageUrl: "https://example.com/amoxicillin.jpg"
  },
  {
    name: "Lisinopril",
    genericName: "Lisinopril",
    brandNames: ["Prinivil", "Zestril"],
    drugClass: "ACE Inhibitor",
    activeIngredient: "Lisinopril",
    dosageForms: ["TABLET"],
    standardDosages: ["5mg", "10mg", "20mg"],
    indications: ["Hypertension", "Heart failure", "Post-myocardial infarction"],
    sideEffects: ["Dry cough", "Dizziness", "Headache", "High potassium levels"],
    foodInteractions: ["Potassium-rich foods (can cause hyperkalemia)"],
    imageUrl: "https://example.com/lisinopril.jpg"
  },
  {
    name: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    brandNames: ["Lipitor"],
    drugClass: "Statin",
    activeIngredient: "Atorvastatin",
    dosageForms: ["TABLET"],
    standardDosages: ["10mg", "20mg", "40mg", "80mg"],
    indications: ["High cholesterol", "Cardiovascular disease prevention"],
    sideEffects: ["Muscle pain", "Diarrhea", "Joint pain"],
    foodInteractions: ["Grapefruit juice (increases drug levels in blood)"],
    imageUrl: "https://example.com/atorvastatin.jpg"
  }
];

async function seed() {
  try {
    const { default: connectDB } = await import('../lib/mongoose');
    await connectDB();
    console.log('Connected to DB');

    await Medicine.deleteMany({});
    console.log('Cleared existing medicines');

    await Medicine.insertMany(sampleMedicines);
    console.log('Inserted sample medicines');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
