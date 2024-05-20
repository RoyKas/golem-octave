function res = Int_Num(xo,yo,L,xa,xb,ya,yb);
 res = dblquad(@(x,y) integrando(x,y,xo,yo,L), xa, xb, ya, yb);
endfunction

