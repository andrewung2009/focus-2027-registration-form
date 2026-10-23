export const CAMP = {
  name: "Focus",
  year: 2027,
  cutoffDate: "2028-01-01",
  ageAsOf: "31 December 2027",
  formVersion: "1.1.0",
  endpoint: "https://script.google.com/macros/s/AKfycbzsl_6pNNWXjnc3tr8Hq1h5SihG0a5weH7zmf-8l_AdJ0LWeZxhyi1CS9fMgUv_L1uUcA/exec",
};

export const PAYMENT = {
  bank: "Maybank",
  account: "5123 4567 8901",
  accountName: "Holy Trinity Bukit Bintang",
  reference: "Focus 2027",
  note: "Attach the banking receipt (screenshot or PDF) for your camp fees below.",
};

export const CUTOFF_DATE = CAMP.cutoffDate;

export const AGE_BANDS = {
  child: { dobFrom: "2017-01-01", dobTo: null },
  youth: { dobFrom: "2010-01-01", dobTo: "2016-12-31" },
  adult: { dobFrom: null, dobTo: "2009-12-31" },
};

export const CHTBB_BAND = { minYears: 1.5, maxYearsExclusive: 11 };
