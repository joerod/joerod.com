const DEFAULT_BY_CATEGORY = {
  halloween: [
    { id: "Ht3gFCqpFkE" }, { id: "aDm4L7gjYNs" }, { id: "gVgsadEybgQ" },
    { id: "bSxuXQCEC7" }, { id: "HcrTqof683A" }, { id: "cl3sud_uDhc" },
    { id: "E16S5BAkzQ8" }, { id: "3CAQ0iZKP08" }, { id: "7bmB4RhsYgQ" },
    { id: "IYmiSXEQ7ys" }, { id: "5tIhwITwhSg" }, { id: "Vf-TZzGNQL0" },
    { id: "cLsAlBG8Qv4" }, { id: "bLiXjaPqSyY" }
  ],
  xmas: [
    { id: "rgEP1niScLc" }, { id: "S7OWoc-j8qQ" }, { id: "hZ9q3PtiYu8" },
    { id: "E3RQVcNUcTA" }, { id: "GPG3zSgm_Qo" }, { id: "tR_Z1LUDQuQ" },
    { id: "kSkyv8EUEsU" }, { id: "uIsgSQvsRj8" }, { id: "e-r8hvTFVb8" },
    { id: "myzC3f0j9kw" }, { id: "LznVSn7Ud9o" }, { id: "L0CL__Tvp-o" },
    { id: "7-nzlKUQ1QQ" }, { id: "3Hj3U18FHgQ" }, { id: "bPpcfH_HHH8" },
    { id: "jDdSQlCbJ90" }, { id: "V87fsP5B05k" }, { id: "iaQBQp5tgcw" },
    { id: "cPbSI4TT3zk" }, { id: "GP5ss2lYb3Y" }, { id: "uhfS2k_KCfw" },
    { id: "-vZdvDjkm8w" }, { id: "Ao_mMCOehU4" }, { id: "T_aiaYkcSDo" },
    { id: "yXQViqx6GMY" }, { id: "VhvM-cTAinY" }, { id: "jW1FpwGWG3s" },
    { id: "QLcTEg4ybWQ" }, { id: "5oGbyo9edg8" }, { id: "SvK3jEXJFdg" },
    { id: "i53l4ozu7SE" }, { id: "elbIj6L34aU" }, { id: "P-__sLKSaSU" },
    { id: "E0fJcnsns4c" }
  ],
  holiday: [
    { id: "7NiGq6q3Z34" }, { id: "TmoeZHnOJKA" },
    { id: "U1mlCPMYtPk" }, { id: "N_lCmBvYMRs" }
  ],
  regular: [
    { id: "CMNry4PE93Y" }, { id: "dQw4w9WgXcQ" },
    { id: "6GsCmnZnllk" }, { id: "kR2O_xuVvIU" },
    { id: "1VbZE6YhjKk" }, { id: "ohz8_IafGwE" },
    { id: "S2XvxDaIwCw" }, { id: "7wrw19K_g_M" },
    { id: "TkyLnWm1iCs" }, { id: "5ztwns5PkJY" },
    { id: "GV01B5kVsC0" }, { id: "rzQAC8kPJxo" },
    { id: "7ujwjqIldwU" }, { id: "5UDoSc-fRpg" },
    { id: "pCTfxOrX4k8" }, { id: "Dr0m5bWAgk0" },
    { id: "lMDkxFnUTZs" }, { id: "voDqfVthTpA" },
    { id: "y8p1iG-6d-w" }, { id: "-riX6Xbvb8w" },
    { id: "Abr_LU822rQ" }, { id: "9m_12SGXNKw" },
    { id: "JJmqCKtJnxM" }, { id: "NZJrGuC92U8" },
    { id: "sZywE0AT1qY" }, { id: "3O0ptHIh6Yo" },
    { id: "KoPFkjF-Bdo" }, { id: "c1EyN9xTK94" },
    { id: "ODmhPsgqGgQ" }, { id: "jsLUidiYm0w" },
    { id: "cgg9byUy-V4" }, { id: "H_yAOI6FLqk" },
    { id: "VFIzTzRuSL8" }, { id: "DevuEUSZ6Xk" },
    { id: "KS6f1MKpLGM" }, { id: "zE7PKRjrid4" },
    { id: "73ytL_HAwt8" }, { id: "M4nFSdNNFQw" },
    { id: "EiTYwecY41c" }, { id: "W45DRy7M1no" },
    { id: "4ORMeSJsYIM" }, { id: "eSOSJ68xOBA" }
  ]
};

function flattenDefaultVideos() {
  const out = [];
  Object.keys(DEFAULT_BY_CATEGORY).forEach((category) => {
    DEFAULT_BY_CATEGORY[category].forEach((v) => {
      out.push({ id: v.id, category });
    });
  });
  return out;
}

module.exports = { DEFAULT_BY_CATEGORY, flattenDefaultVideos };
