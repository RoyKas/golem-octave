#!/usr/bin/octave -qfW
# In this script 2 ways of calculating the values of a two-dimensional function
# are compared, the time taken by each way is measured and it is verified that
# there are no discrepancies in the results. Each of the function values is
# calculated by means of a two-dimensional integral.
pkg load parallel
# Square root of the number of points where the function is calculated.
npo = 51;
# Dimensions of the integration domain
L = 10; xa = -L; xb = L; ya = -L; yb = L;
# Function integrand definition
function intg = integrando(x,y,xo,yo,L)
 intg = cos(((x-xo).^2 + (y-yo).^2)/L).^2;
endfunction
# Numerical integration definition
function res = Int_Num(xo,yo,L,xa,xb,ya,yb);
 res = dblquad(@(x,y) integrando(x,y,xo,yo,L), xa, xb, ya, yb);
endfunction
# Fist method, using two for loops, defining the function to calculate
# within the double loop.
tic
for m = 1:npo
 xo = L*0.8*((2*(m-1)/(npo-1))-1);
for l = 1:npo
 yo = L*0.8*((2*(l-1)/(npo-1))-1);
 INTENSITY_1(m,l) = dblquad(@(x,y) integrando(x,y,xo,yo,L),xa,xb,ya,yb);
 endfor
endfor
t1 = toc
# Second method, using pararrayfun to call Int_Num
range = linspace(-L*0.8,L*0.8,npo);
[xo,yo] = meshgrid(range);
tic
INTENSITY_2 = pararrayfun(12,@(xo,yo) Int_Num(xo,yo,L,xa,xb,ya,yb),xo,yo);
t2 = toc
discrepancy = max(max(INTENSITY_2-INTENSITY_1))

