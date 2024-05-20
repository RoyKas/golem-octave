function intg = integrando(x,y,xo,yo,L)
 intg = cos(((x-xo).^2 + (y-yo).^2)/L).^2;
endfunction

function res = Int_Num(xo,yo,L,xa,xb,ya,yb);
 res = dblquad(@(x,y) integrando(x,y,xo,yo,L), xa, xb, ya, yb);
endfunction

