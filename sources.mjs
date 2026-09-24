export const SOURCES = {
  Waymo: { hosts:['waymo.com','www.waymo.com','community.waymo.com'], pages:[{url:'https://waymo.com/',dynamic:true},{url:'https://waymo.com/updates/',dynamic:false}] },
  Uber: { hosts:['www.uber.com','uber.com','investor.uber.com','waymo.com'], pages:[{url:'https://www.uber.com/newsroom/',dynamic:false},{url:'https://www.uber.com/ae/en/newsroom/',dynamic:false},{url:'https://waymo.com/',dynamic:true}] },
  Lyft: { hosts:['www.lyft.com','lyft.com','investor.lyft.com'], pages:[{url:'https://www.lyft.com/blog',dynamic:false},{url:'https://www.lyft.com/autonomous',dynamic:true}] },
  Tesla: { hosts:['www.tesla.com','tesla.com'], pages:[{url:'https://www.tesla.com/support/robotaxi',dynamic:true},{url:'https://www.tesla.com/robotaxi',dynamic:true}] }
};
export const OPERATORS = ['Waymo','Tesla','WeRide','May Mobility','Baidu Apollo Go','Motional','Avride','Wayve','Nuro','Pony.ai','Momenta','Mobileye','Unbekannt'];
export const PLATFORMS = ['Waymo','Uber','Lyft','Tesla Robotaxi','Unbekannt'];
