function GraphicsTest(docTag)
{
	function Phong(F0,N,V,L,M)
	{
		var H = add(V,L).unit();
		var NdotL = Math.max(0, dot(N,L));
		var NdotH = dot(N,H);
		var NdotV = dot(N,V);
		var VdotH = dot(V,H);
		var LdotH = dot(L,H);

		var NdotV = dot(V,N);
		var RV = sub(mul(N, NdotV * 2), V);

		var RVdotL = dot(RV,L);
		var RdotV = Math.max(0,RVdotL);

		var n = 2;

		var f = Math.pow(NdotL, n+1);

		return f;
	}
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		var canvas = document.createElement('canvas');
		canvas.width  = 700;
		canvas.height = 700;
		canvas.style.border   = "2px solid black";
		canvas.style.marginLeft = "auto";
		canvas.style.marginRight = "auto";
		canvas.style.display = "block";
		
		root.appendChild(canvas);

		var camera = new Camera(canvas);
		camera.setUnitScale(Math.min(canvas.width, canvas.height)/2);
		camera.clear();
		camera.drawHemisphere(new Vector(0,0), new Vector(0,1), 1);
		//camera.drawBRDFGraph(Lambert, new Vector(0,1,0), new Vector(0,1,0), 0, 0, 0,0);
		camera.drawBRDFGraph(Phong, new Vector(0,1), new Vector(0,1), 0, 0, new Vector(0,0), 1);

		for (var ang = -90; ang <= 90; ang += 15)
		{
			var L = new Vector(-Math.sin(ang * Math.PI / 180), -Math.cos(ang * Math.PI / 180), 0);

			camera.drawArrow(new Vector(-0.65 * L.x, -0.65 * L.y), L, 0.15, "#FFC000", 1.5);
			camera.drawText(new Vector(-0.72 * L.x, -0.72 * L.y), "Li = 1.0");
			camera.drawLight(new Vector(-0.67 * L.x, -0.67 * L.y), 0.04);
		}
		
	}
	
	setup();
}
