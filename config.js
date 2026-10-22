export const CAMP = {
  name: "Focus",
  year: 2027,
  cutoffDate: "2028-01-01",
  formVersion: "1.1.0",
  endpoint: "/api/register",
};

export const CUTOFF_DATE = CAMP.cutoffDate;

export const AGE_BANDS = {
  child: { dobFrom: "2017-01-01", dobTo: null },
  youth: { dobFrom: "2010-01-01", dobTo: "2016-12-31" },
  adult: { dobFrom: null, dobTo: "2009-12-31" },
};

export const CHTBB_BAND = { minYears: 1.5, maxYearsExclusive: 11 };
