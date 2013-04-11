// title: Transparency
// author: Rene K. Mueller
// description: showing transparent objects

function main() {
   var o = [];
   for(var i=0; i<8; i++) {
      o.push(cylinder({r:3,h:20}).
         setColor( 
            hsl2rgb(i/8,1,0.5).  // hsl to rgb, creating rainbow [r,g,b]
            concat(1/8+i/8)      // and add to alpha to make it [r,g,b,a]
         ).translate([(i-3)*7.5,0,0])
      );
   }
   o.push(color("red",cube(5)).translate([-4,-10,0]));
   o.push(color("red",0.5,cube(5)).translate([4,-10,0]));
   return o;
}
