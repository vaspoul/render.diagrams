function Vector(x,y)
{
  this.x = x || 0;
  this.y = y || 0;
}

Vector.prototype.copy = function()
{
	return new Vector(this.x, this.y);
}

Vector.prototype.neg = function() 
{
	return new Vector(-this.x, -this.y);
}

Vector.prototype.unit = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y);
	return new Vector(this.x/L, this.y/L);
}

Vector.prototype.norm = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y);
	return new Vector(this.x/L, this.y/L);
}

Vector.prototype.length = function() 
{
	return Math.sqrt(this.x*this.x + this.y*this.y);
}

Vector.prototype.lengthSqr = function() 
{
	return (this.x*this.x + this.y*this.y);
}

function add(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x + b.x, a.y + b.y);
		}
		else
		{
			return new Vector(a.x + b, a.y + b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a + b.x, a + b.y);
		}
		else
		{
			return (a + b);
		}
	}
}

function addv()
{
	if (arguments.length==0)
		return 0;
	else if (arguments.length==1)
		return arguments[0];

	var result = arguments[0];

	for (var i=1; i!=arguments.length; ++i)
	{
		result = add(result, arguments[i]);
	}

	return result;
}

function sub(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x - b.x, a.y - b.y);
		}
		else
		{
			return new Vector(a.x - b, a.y - b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a - b.x, a - b.y);
		}
		else
		{
			return (a - b);
		}
	}
}

function mul(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x * b.x, a.y * b.y);
		}
		else
		{
			return new Vector(a.x * b, a.y * b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a * b.x, a * b.y);
		}
		else
		{
			return (a * b);
		}
	}
}

function div(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x / b.x, a.y / b.y);
		}
		else
		{
			return new Vector(a.x / b, a.y / b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a / b.x, a / b.y);
		}
		else
		{
			return (a / b);
		}
	}
}

function dot(a,b) 
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return (a.x * b.x + a.y * b.y);
}

function cross(a,b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return a.x * b.y - b.x * a.x;
}

function min(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y));
		}
		else
		{
			return new Vector(Math.min(a.x, b), Math.min(a.y, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a, b.x), Math.min(a, b.y));
		}
		else
		{
			return Math.min(a, b);
		}
	}
}

function max(a, b)
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y));
		}
		else
		{
			return new Vector(Math.max(a.x, b), Math.max(a.y, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.max(a, b.x), Math.max(a, b.y));
		}
		else
		{
			return Math.max(a, b);
		}
	}
}

function clamp(v, lower, upper)
{
	return min(max(v, lower), upper);
}

function saturate(v)
{
	return min(max(v, 0), 1);
}

function avg(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return mul(add(a,b), 0.5);
}

function quantize(v, q)
{
	return mul(floor(div(v, q)), q);
}

function distance(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return sub(a,b).length();
}

function distanceSqr(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return sub(a,b).lengthSqr();
}

function equal(a, b)
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return (a.x == b.x) && (a.y == b.y);
		}
		else
		{
			return (a.x == b) && (a.y == b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return (a == b.x) && (a == b.y);
		}
		else
		{
			return (a == b);
		}
	}

	return false;
}

function length(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return Math.sqrt(dot(v,v));
}

function lengthSqr(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return dot(v,v);
}

function normalize(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return div(v, length(v));
}

function reflect(v,n)
{
	if ( !(typeof(v) === "object") || !(typeof(n) === "object") )
		return;
	
	n = normalize(n);
	
	return sub(v, mul(n, dot(v,n) * 2));
}

function transpose(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(v.y, -v.x);
}

function toAngle(v)
{
	if ( !(typeof(v) === "object") )
		return;

	var a = Math.atan2(v.y, v.x);

	//if (a<0)
	//	a += Math.PI*2;

	return a;
}

function fromAngle(a)
{
	return new Vector(Math.cos(a), Math.sin(a));
}

function toDegrees(v)
{
	if (typeof(v) === "object")
	{
		return new mul(v, 180.0 / Math.PI);
	}
	else
	{
		return v * 180.0 / Math.PI;
	}
}

function toRadians(v)
{
	if (typeof(v) === "object")
	{
		return new mul(v, Math.PI / 180.0);
	}
	else
	{
		return v * Math.PI / 180.0;
	}
}

function InsideAngleRange(testAngle, startAngle, endAngle)
{
	if (startAngle < endAngle)
		return testAngle >= startAngle && testAngle <= endAngle;
	else
		return testAngle >= startAngle || testAngle <= endAngle;
}

function IsClosedLoop(startAngle, endAngle)
{
	return (startAngle == endAngle) || (Math.abs(this.endAngle - this.startAngle) == Math.PI*2);
}

function mad(v, s, b)
{
	return add(mul(v,s),b);
}

function lerp(a, b, t)
{
	return mad(sub(b,a), t, a);
}

function floor(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.floor(v.x), Math.floor(v.y));
}

function ceil(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.ceil(v.x), Math.ceil(v.y));
}

function round(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.round(v.x), Math.round(v.y));
}

function abs(v)
{
	if ( !(typeof(v) === "object") )
		return Math.abs(v);

	return new Vector(Math.abs(v.x), Math.abs(v.y));
}

function rotate(v,a)
{
	if ( !(typeof(v) === "object") )
		return;

	var xAxis = new Vector(Math.cos(a), Math.sin(a));
	var yAxis = transpose(xAxis).neg();

	return add( mul(xAxis, v.x), mul(yAxis, v.y) );
}

function lineClosestPoint(point, pointA, pointB)
{
	var lineV = sub(pointB, pointA);
	var lineLength = length(lineV);
	var lineDir = div(lineV, lineLength);

	var AP = sub(point, pointA);

	var projLength = dot(AP, lineDir);

	projLength = Math.max(0, Math.min(lineLength, projLength));

	return mad(projLength, lineDir, pointA);
}

function intersectRayLine(rayStart, rayDir, pointA, pointB, rayRadius)
{
	if (rayRadius == undefined || rayRadius<0)
		rayRadius = 0;

	var lineV = sub(pointB, pointA);
	var lineLength = length(lineV);
	var lineDir = div(lineV, lineLength);
	var lineNorm = transpose(lineDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};
		
	var height = dot(sub(rayStart, pointA), lineNorm) - rayRadius;
	
	var tRay = height / (-dot(rayDir, lineNorm));

	// don't allow impacts behind the ray start...but make some allowance for rays with a radius 
	// (this helps with resting bouncing balls)
	if ( tRay<-rayRadius)
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
	if (rayRadius>0)
	{
		I = add(I, mul(lineNorm, -rayRadius));
	}

	var tLine = dot(sub(I, pointA), lineDir) / lineLength;
	
	if ( (tLine>1) || (tLine<0) )
		return result;
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayRay(rayStart, rayDir, otherRayStart, otherRayDir)
{
	var lineNorm = transpose(otherRayDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};
		
	L = dot( sub(rayStart, otherRayStart), lineNorm);
	
	var tRay = L / (-dot(rayDir, lineNorm));

	if ( tRay<0 )
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
	var tLine = dot(sub(I, otherRayStart), otherRayDir);
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function overlapRayRect(rayStart, rayDir, rectMin, rectMax, rayRadius)
{
	if (rayRadius == undefined || rayRadius<0)
		rayRadius = 0;
	
	rayDir = rayDir.unit();
	var tan = transpose(rayDir);
	var absTan = abs(tan);

	var rectCenter = avg(rectMin, rectMax);
	var rectSize = mul(sub(rectMax, rectMin), 0.5);

	var rectRadius = dot(rectSize, absTan);

	var rectDist = Math.abs(dot(sub(rectCenter, rayStart), tan));

	return rectDist <= rectRadius;
}

function overlapRectLine(rectMin, rectMax, lineA, lineB)
{
	var L = sub(lineB, lineA);
	var l = L.length();
	L  = div(L, l);
	var C = avg(rectMin, rectMax);
	var AC = sub(C, lineA);
	var d = dot(AC, L);

	d = Math.max(0, Math.min(l, d));

	var p = add(lineA, mul(L, d));

	if (	p.x < Math.min(rectMin.x, rectMax.x) ||
			p.y < Math.min(rectMin.y, rectMax.y) ||
			p.x > Math.max(rectMin.x, rectMax.x) ||
			p.y > Math.max(rectMin.y, rectMax.y) )
	{
		return false;
	}
		
	return true;
}

function overlapRectOBB(rectMin, rectMax, obbPoints)
{
	if (obbPoints[0].x < rectMin.x && obbPoints[1].x < rectMin.x && obbPoints[2].x < rectMin.x && obbPoints[3].x < rectMin.x)
		return false;

	if (obbPoints[0].x > rectMax.x && obbPoints[1].x > rectMax.x && obbPoints[2].x > rectMax.x && obbPoints[3].x > rectMax.x)
		return false;

	if (obbPoints[0].y < rectMin.y && obbPoints[1].y < rectMin.y && obbPoints[2].y < rectMin.y && obbPoints[3].y < rectMin.y)
		return false;

	if (obbPoints[0].y > rectMax.y && obbPoints[1].y > rectMax.y && obbPoints[2].y > rectMax.y && obbPoints[3].y > rectMax.y)
		return false;

	var axis1 = sub(obbPoints[1], obbPoints[0]);
	var length1 = axis1.length();
	axis1 = div(axis1, length1);

	var aabbPoints = [	sub(new Vector(rectMin.x, rectMin.y), obbPoints[0]),
						sub(new Vector(rectMin.x, rectMax.y), obbPoints[0]),
						sub(new Vector(rectMax.x, rectMax.y), obbPoints[0]),
						sub(new Vector(rectMax.x, rectMin.y), obbPoints[0]) ];

	var dots1 = [	dot(aabbPoints[0], axis1),
					dot(aabbPoints[1], axis1),
					dot(aabbPoints[2], axis1),
					dot(aabbPoints[3], axis1) ];

	if (dots1[0]<0 && dots1[1]<0 && dots1[2]<0 && dots1[3]<0)
		return false;

	if (dots1[0]>length1 && dots1[1]>length1 && dots1[2]>length1 && dots1[3]>length1)
		return false;


	var axis2 = sub(obbPoints[3], obbPoints[0]);
	var length2 = axis2.length();
	axis2 = div(axis2, length2);

	var dots2 = [	dot(aabbPoints[0], axis2),
					dot(aabbPoints[1], axis2),
					dot(aabbPoints[2], axis2),
					dot(aabbPoints[3], axis2) ];

	if (dots2[0]<0 && dots2[1]<0 && dots2[2]<0 && dots2[3]<0)
		return false;

	if (dots2[0]>length2 && dots2[1]>length2 && dots2[2]>length2 && dots2[3]>length2)
		return false;

	return true;
}

// https://codepen.io/pen?editors=0110
function wavelengthToColor(wavelength)
{
    var Gamma = 0.80;
    var IntensityMax = 255;
    var factor, red, green, blue;

    if ((wavelength >= 380) && (wavelength<440))
	{
        red = -(wavelength - 440) / (440 - 380);
        green = 0.0;
        blue = 1.0;
    }
	else if ((wavelength >= 440) && (wavelength<490))
	{
        red = 0.0;
        green = (wavelength - 440) / (490 - 440);
        blue = 1.0;
    }
	else if ((wavelength >= 490) && (wavelength<510))
	{
        red = 0.0;
        green = 1.0;
        blue = -(wavelength - 510) / (510 - 490);
    }
	else if ((wavelength >= 510) && (wavelength<580))
	{
        red = (wavelength - 510) / (580 - 510);
        green = 1.0;
        blue = 0.0;
    }
	else if ((wavelength >= 580) && (wavelength<645))
	{
        red = 1.0;
        green = -(wavelength - 645) / (645 - 580);
        blue = 0.0;
    }
	else if ((wavelength >= 645) && (wavelength<781))
	{
        red = 1.0;
        green = 0.0;
        blue = 0.0;
    }
	else
	{
        red = 0.0;
        green = 0.0;
        blue = 0.0;
    };
	
	// Let the intensity fall off near the vision limits
    if ((wavelength >= 380) && (wavelength<420))
	{
        factor = 0.3 + 0.7*(wavelength - 380) / (420 - 380);
    }
	else if ((wavelength >= 420) && (wavelength<701))
	{
        factor = 1.0;
    }
	else if ((wavelength >= 701) && (wavelength<781))
	{
        factor = 0.3 + 0.7*(780 - wavelength) / (780 - 700);
    }
	else
	{
        factor = 0.0;
    }

    if (red !== 0)
	{
        red = Math.round(IntensityMax * Math.pow(red * factor, Gamma));
    }
    
	if (green !== 0)
	{
        green = Math.round(IntensityMax * Math.pow(green * factor, Gamma));
    }

    if (blue !== 0)
	{
        blue = Math.round(IntensityMax * Math.pow(blue * factor, Gamma));
    }

    return [red,green,blue, "rgb(" + red.toFixed(0) + ", " + green.toFixed(0) + ", " + blue.toFixed(0) + ")"];
}

var pseudoRandom = {};

(function()
{
	pseudoRandom.seed = 0;

	pseudoRandom.setSeed = function(seed)
	{
		pseudoRandom.seed = seed;
	}

	pseudoRandom.random = function(seed)
	{
		if (seed !== undefined)
		{
			pseudoRandom.seed = seed;
		}

		var x = Math.sin(pseudoRandom.seed++) * 10000;
		return x - Math.floor(x);
	}

})();