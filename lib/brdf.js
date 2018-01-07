function Phong(F0,N,V,L,M)
{
	var H = add(V,L).unit();
	var NdotL = Math.max(0, dot(N,L));
	var NdotH = dot(N,H);
	var NdotV = dot(N,V);
	var VdotH = dot(V,H);
	var LdotH = dot(L,H);

	var NdotV = dot(V,N);
	var RV = reflect(V.neg(),N);

	var RVdotL = dot(RV,L);
	var RdotV = Math.max(0,RVdotL);
		
	var F = 1;
	var D = 1;
	var G = 1;

	// F, Schlick
	{
		F = F0 + (1.0 - F0) * Math.pow(1.0 - Math.abs(LdotH), 5);
	}

	// D, Phong
	{
		var phongExponent = Math.pow(2, 11 * (1-M));
		var energyConservationFactor = ((phongExponent + 2) / (2 * Math.PI));
	
		D = energyConservationFactor * Math.pow(RdotV, phongExponent);
	}

	// G, Implicit
	{
		G = 4 * NdotL * NdotV;
	}

	//F = 1;
	//D = 1;
	//G = 1;

	var f = F*D*G / (Math.max(0.00001, 4 * NdotL * NdotV));

	f *= NdotL;

	return f;
}

function Lambert(F0,N,V,L,M)
{
	var NdotL = Math.max(0, dot(N,L));
	var NdotV = dot(V,N);

	return NdotL * (NdotV>0);
}


function ConstantHemi(F0,N,V,L,M)
{
	var NdotL = dot(N,L);

	return (NdotL>=0) ? 1 : 0;
}
