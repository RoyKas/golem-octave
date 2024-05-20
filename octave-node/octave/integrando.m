function intg = integrando(x,y,xo,yo,L)
 intg = cos(((x-xo).^2 + (y-yo).^2)/L).^2;
endfunction
