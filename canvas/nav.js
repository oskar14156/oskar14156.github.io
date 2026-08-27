const b = document.querySelector('#themeBtn');
if (b) b.onclick = () => {
  const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n;
  localStorage.setItem('theme', n);
};
const here = location.pathname;
document.querySelectorAll('header nav a').forEach((a) => {
  if (a.getAttribute('href') === here) a.classList.add('on');
});
