const mongoose = require('mongoose');

const DiplomaSchema = new mongoose.Schema({
  documentId: String,
  studentName: String,
  course: String,
  dateIssued: Date
});

const Diploma = mongoose.model('Diploma', DiplomaSchema);

module.exports = Diploma;
