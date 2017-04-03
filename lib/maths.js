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

Vector.prototype.length = function() 
{
	return Math.sqrt(this.x*this.x + this.y*this.y);
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
			return new Vector(a + b.x, a + b.y);
		}
	}
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

function min(a,b) 
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y));
}

function max(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y));
}

function avg(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return mul(add(a,b), 0.5);
}

function distance(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return sub(a,b).length();
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

function mad(v, s, b)
{
	if ( !(typeof(v) === "object") )
		return;

	return add(mul(v,s),b);
}

function addmul(a, b, c)
{
	if ( !(typeof(a) === "object") )
		return;

	return mul(add(a,b),c);
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

function round(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.round(v.x), Math.round(v.y));
}

function abs(v)
{
	if ( !(typeof(v) === "object") )
		return;

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

function intersectRayLine(rayStart, rayDir, pointA, pointB)
{
	var lineV = sub(pointB, pointA);
	var lineLength = length(lineV);
	var lineDir = div(lineV, lineLength);
	var lineNorm = transpose(lineDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};
		
	L = dot( sub(rayStart, pointA), lineNorm);
	
	var tRay = L / (-dot(rayDir, lineNorm));

	if ( tRay<0 )
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
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

function intersectRectLine(rectMin, rectMax, lineA, lineB)
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