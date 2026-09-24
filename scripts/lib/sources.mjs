export const SOURCES = {
  Waymo:{hosts:['waymo.com','www.waymo.com','community.waymo.com'],pages:[{url:'https://waymo.com/',dynamic:true},{url:'https://waymo.com/blog/',kind:'index'},{url:'https://waymo.com/updates/',kind:'index'}],sitemaps:['https://waymo.com/sitemap.xml'],watch:['https://waymo.com/blog/2026/08/waymo-in-munich/','https://waymo.com/blog/2026/09/waymo-in-singapore/']},
  Uber:{hosts:['www.uber.com','uber.com','investor.uber.com','waymo.com'],pages:[{url:'https://www.uber.com/us/en/newsroom/',kind:'index'},{url:'https://www.uber.com/ae/en/newsroom/',kind:'index'},{url:'https://www.uber.com/de/en/newsroom/',kind:'index'},{url:'https://waymo.com/',dynamic:true}]},
  Lyft:{hosts:['www.lyft.com','lyft.com','investor.lyft.com'],pages:[{url:'https://www.lyft.com/blog',kind:'index'},{url:'https://www.lyft.com/autonomous',dynamic:true}]},
  Tesla:{hosts:['www.tesla.com','tesla.com'],pages:[{url:'https://www.tesla.com/support/robotaxi',dynamic:true},{url:'https://www.tesla.com/robotaxi',dynamic:true}]}
};
export const OPERATORS=['Waymo','Tesla','WeRide','May Mobility','Baidu Apollo Go','Motional','Avride','Wayve','Nuro','Pony.ai','Momenta','Mobileye','Autobrains','Unbekannt'];
export const PLATFORMS=['Waymo','Uber','Lyft','Tesla Robotaxi','Unbekannt'];
