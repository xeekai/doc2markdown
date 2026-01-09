
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, ConversionResult, BatchItem } from './types';
import { optimizeMarkdownForAI } from './services/geminiService';
import { 
  FileUp, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Download, 
  Trash2, 
  FileText, 
  ScanSearch, 
  Languages,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Globe,
  Eye,
  Code,
  Camera,
  RefreshCw,
  HardDrive,
  Layers,
  FileCheck,
  ListFilter
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow as darkStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const SUPPORTED_LANGUAGES = [
  { label: 'English', code: 'eng' },
  { label: 'Spanish', code: 'spa' },
  { label: 'French', code: 'fra' },
  { label: 'German', code: 'deu' },
  { label: 'Chinese (Simp)', code: 'chi_sim' },
  { label: 'Japanese', code: 'jpn' },
  { label: 'Portuguese', code: 'por' },
  { label: 'Italian', code: 'ita' },
];

interface ImageAsset {
  id: string;
  name: string;
  base64: string;
  previewUrl: string;
  type: string;
}

const MetropolisLogo = () => (
  <svg width="400" height="44" viewBox="0 0 513 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full">
    <path d="M2.90222 49.5954C2.71627 49.4771 2.46271 49.4095 2.17533 49.3757C1.87105 49.3419 1.61749 49.2236 1.41463 49.0038C1.21178 48.801 1.00893 48.5981 0.822981 48.4122L0.265137 47.3304V18.7632C0.569415 17.9011 0.85679 17.3602 1.14416 17.1574C1.43154 16.9545 1.87105 16.701 2.47961 16.3967C3.6122 16.3291 4.66027 16.701 5.64073 17.5293L21.3111 33.0806L37.5393 16.6165C38.4014 16.1601 39.2297 15.9741 40.0242 16.0587C41.4104 16.4812 42.1711 17.225 42.2894 18.3237V47.2289C41.7992 48.7672 40.7511 49.5616 39.1283 49.6123C37.7759 49.2405 36.88 48.4798 36.4743 47.3473L36.525 26.3022L22.8325 40.1125C21.8858 40.6703 20.9392 40.7041 20.0094 40.1632L6.08024 26.4037V47.3304C5.96191 47.5501 5.82668 47.7867 5.69144 48.0403C5.5393 48.2939 5.33645 48.5305 5.09979 48.7841C4.84622 49.0376 4.64337 49.2067 4.45742 49.325L2.93603 49.6123L2.90222 49.5954Z" fill="url(#paint0_linear_616_2162)"/>
    <path d="M49.9303 21.9745L48.2567 20.8927C48.0708 20.7068 47.9186 20.4532 47.8341 20.149C47.7327 19.8447 47.6989 19.5404 47.6989 19.2362V18.3234C48.0877 16.988 48.8315 16.2104 49.9303 16.0245H88.0496C89.0132 16.4471 89.5879 16.7851 89.7739 17.0218C89.9598 17.2584 90.1119 17.5458 90.2134 17.8501C90.2979 18.1543 90.3486 18.4586 90.3486 18.7629V19.6756C89.9598 20.8251 89.1991 21.5858 88.0496 21.9745H49.9303ZM50.3867 49.5782C50.2007 49.4598 49.9472 49.3922 49.6429 49.3415C49.3386 49.3077 49.085 49.1725 48.8653 48.9696C48.6624 48.7668 48.4596 48.5639 48.2567 48.3611L47.682 47.2793V31.0349C48.1046 29.5474 49.0005 28.8036 50.3698 28.8036H83.9588C84.1447 28.8881 84.3983 28.9557 84.7025 29.0064C85.0068 29.0572 85.2604 29.1924 85.4801 29.3783C85.683 29.5643 85.8858 29.784 86.0887 30.0038C86.2746 30.1897 86.4099 30.4094 86.4606 30.663C86.5282 30.9166 86.562 31.187 86.5958 31.4913C86.6296 31.7955 86.6635 32.0998 86.6635 32.4041C86.2408 33.7057 85.3787 34.517 84.0771 34.8213H53.5985V43.4928H87.9313C88.7765 43.7633 89.2836 44.0338 89.4527 44.3042C89.6217 44.5747 89.7908 44.862 89.9429 45.1663C90.095 45.4706 90.1965 45.7748 90.2641 46.0791C90.3317 46.3834 90.3486 46.7553 90.3486 47.1609C89.926 48.4963 89.0132 49.3077 87.5932 49.5782H50.3867Z" fill="url(#paint1_linear_616_2162)"/>
    <path d="M116.821 49.5951C116.517 49.4767 116.246 49.4091 115.993 49.3584C115.739 49.3246 115.502 49.1725 115.249 48.902C114.995 48.6316 114.775 48.4118 114.59 48.209L114.133 47.2962V21.9745H98.0063L96.3328 20.8927C96.1468 20.7068 95.9947 20.4532 95.9102 20.149C95.8087 19.8447 95.758 19.5404 95.758 19.2362V18.3234C96.1468 16.988 96.8906 16.2104 98.0063 16.0245H136.126C137.309 16.4809 137.985 16.988 138.171 17.512C138.34 18.0529 138.425 18.4755 138.425 18.7798V19.6926C138.036 20.842 137.275 21.6027 136.126 21.9914H120.05V47.1947C119.712 48.7668 118.63 49.5613 116.838 49.612L116.821 49.5951Z" fill="url(#paint2_linear_616_2162)"/>
    <path d="M146.488 49.5951C146.302 49.4767 146.048 49.4091 145.744 49.3584C145.44 49.3246 145.186 49.1894 144.967 48.9865C144.764 48.7837 144.561 48.5808 144.358 48.378L143.783 47.2962V33.0633C144.206 31.4575 145.169 30.6292 146.657 30.5954H175.192C176.797 30.1052 177.66 29.6995 177.778 29.3952C177.896 29.091 177.048 28.7698 178.234 28.4148C178.42 28.0767 178.522 27.7218 178.522 27.3499C178.522 26.978 178.572 26.6061 178.691 26.2343C178.572 25.8117 178.505 25.4229 178.454 25.051C178.42 24.6791 178.319 24.358 178.167 24.0706C178.015 23.7832 177.778 23.4959 177.474 23.1747C177.169 22.938 176.899 22.7521 176.645 22.6C176.392 22.4478 176.087 22.3295 175.733 22.2281C175.378 22.1267 175.039 22.0422 174.735 21.9745H146.032L144.375 20.8927C144.189 20.7068 144.037 20.4532 143.935 20.149C143.834 19.8447 143.8 19.5404 143.8 19.2362V18.3234C144.257 17.0556 145 16.2949 146.032 16.0245H175.648C176.459 16.2611 177.271 16.4978 178.082 16.7344C178.911 16.988 179.671 17.3429 180.381 17.7993C181.091 18.2557 181.734 18.8305 182.308 19.5235C182.917 20.3349 183.424 21.1632 183.83 22.0253C184.235 22.8873 184.489 23.817 184.607 24.8313C184.726 25.8455 184.726 26.8766 184.607 27.9077C184.489 28.5162 184.371 29.1079 184.235 29.6657C184.1 30.2235 183.88 30.7475 183.576 31.2377C183.272 31.7279 183.001 32.235 182.765 32.7252C183.069 32.9619 183.373 33.2154 183.678 33.5366C183.982 33.8409 184.235 34.1621 184.455 34.517C184.658 34.8551 184.928 35.1932 185.233 35.4974C185.841 36.7145 186.23 37.9654 186.382 39.2331C186.534 40.5009 186.585 41.8025 186.518 43.1717C186.467 44.524 186.433 45.8763 186.433 47.2116C186.095 48.7837 185.013 49.5782 183.221 49.6289C181.683 49.2401 180.804 48.3949 180.584 47.0426L180.533 43.0872C180.685 40.1459 180.28 38.3203 179.333 37.6273C179.113 37.4414 178.86 37.2892 178.623 37.1709C178.37 37.0526 178.099 36.985 177.795 36.9342C177.491 36.9004 177.237 36.8159 177.051 36.6976H149.717V47.3131C149.598 47.5497 149.463 47.7864 149.311 48.023C149.159 48.2766 148.956 48.5132 148.702 48.7668C148.449 49.0203 148.229 49.2063 148.043 49.3077L146.488 49.5951Z" fill="url(#paint3_linear_616_2162)"/>
    <path d="M201.359 49.5954C200.514 49.4771 199.72 49.325 198.976 49.1391C198.232 48.9531 197.505 48.6488 196.795 48.2432C196.085 47.8375 195.426 47.3304 194.817 46.7218C194.31 46.1133 193.854 45.471 193.431 44.7948C193.009 44.1187 192.671 43.4425 192.434 42.7326C192.18 42.0226 192.028 41.262 191.944 40.4675V24.9669C192.13 24.1555 192.349 23.361 192.603 22.5497C192.857 21.7383 193.228 20.9607 193.719 20.2001C194.209 19.4394 194.834 18.7463 195.561 18.1378C196.051 17.8335 196.559 17.5293 197.083 17.2419C197.607 16.9546 198.131 16.701 198.689 16.4982C199.246 16.2953 199.821 16.1263 200.447 16.008H225.651C226.446 16.2446 227.257 16.4813 228.051 16.7179C228.863 16.9715 229.607 17.3433 230.317 17.8335C231.027 18.3238 231.686 18.9492 232.294 19.676C232.717 20.1662 233.072 20.7072 233.376 21.2481C233.681 21.8059 233.917 22.4144 234.069 23.0906C234.222 23.7667 234.391 24.3752 234.593 24.95V40.3323C234.391 41.2113 234.171 42.0902 233.9 42.9354C233.63 43.7975 233.241 44.6089 232.751 45.3695C232.261 46.1302 231.601 46.8233 230.79 47.4318C230.3 47.8544 229.742 48.2094 229.116 48.4967C228.508 48.7841 227.866 49.0038 227.189 49.156C226.513 49.3081 225.837 49.4433 225.144 49.5616H201.326L201.359 49.5954ZM226.851 42.9354C227.274 42.6312 227.612 42.2931 227.849 41.9381C228.102 41.5831 228.271 41.1605 228.373 40.7041C228.474 40.2478 228.575 39.8252 228.694 39.4364V26.353C228.575 25.9642 228.491 25.5754 228.44 25.1528C228.39 24.7302 228.237 24.3414 227.984 24.0034C227.73 23.6653 227.46 23.3272 227.156 23.023C226.851 22.837 226.581 22.668 226.327 22.4989C226.074 22.3468 225.803 22.2454 225.499 22.1778C225.195 22.1271 224.89 22.0595 224.586 21.9749H201.681C201.376 22.0595 201.072 22.1271 200.768 22.1778C200.464 22.2285 200.159 22.3468 199.855 22.4989C199.551 22.6511 199.297 22.8877 199.111 23.192C198.925 23.4963 198.722 23.8005 198.503 24.0879C198.3 24.3752 198.165 24.6964 198.097 25.0683C198.029 25.4402 197.979 25.7613 197.894 26.0656V39.5547C197.979 39.9773 198.063 40.383 198.181 40.7887C198.3 41.1943 198.503 41.5662 198.79 41.9381C199.077 42.31 199.382 42.6312 199.686 42.9354L201.41 43.5101H225.228L226.902 42.9354H226.851Z" fill="url(#paint4_linear_616_2162)"/>
    <path d="M242.708 49.5952C242.522 49.4769 242.268 49.4093 241.964 49.3585C241.66 49.3247 241.406 49.1895 241.186 48.9867C240.983 48.7838 240.781 48.581 240.578 48.3781L240.003 47.2963V33.0635C240.426 31.3731 241.389 30.5617 242.877 30.5955H273.254C274.437 30.2913 275.215 29.9194 275.57 29.4799C275.942 29.0404 276.195 28.6347 276.347 28.2797C276.5 27.9078 276.584 27.5698 276.584 27.2148C276.584 26.8598 276.635 26.4879 276.753 26.0654C276.635 25.7611 276.55 25.423 276.5 25.068C276.449 24.6962 276.33 24.3581 276.178 24.0031C276.026 23.665 275.806 23.3946 275.553 23.1917C275.249 22.9551 274.961 22.7691 274.691 22.617C274.42 22.4649 274.116 22.3466 273.778 22.2451C273.44 22.1437 273.102 22.0592 272.797 21.9916H242.251L240.595 20.9097C240.409 20.7238 240.257 20.4703 240.172 20.166C240.071 19.8617 240.02 19.5575 240.02 19.2532V18.3404C240.409 17.005 241.153 16.2274 242.251 16.0415H273.71C274.522 16.2782 275.316 16.5148 276.128 16.7515C276.939 17.005 277.683 17.36 278.393 17.8164C279.103 18.2728 279.762 18.8475 280.371 19.5406C280.979 20.3519 281.486 21.1971 281.892 22.1268C282.298 23.0396 282.518 24.02 282.585 25.0173C282.636 26.0315 282.67 27.0289 282.67 28.0262C282.484 28.753 282.247 29.4968 281.977 30.2574C281.706 31.0181 281.368 31.6943 280.979 32.3028C280.573 32.8944 280.066 33.5029 279.458 34.1115C278.849 34.6017 278.207 35.0074 277.565 35.3116C276.905 35.6159 276.229 35.9033 275.519 36.1399C274.809 36.3935 274.048 36.5625 273.254 36.6808H245.92V47.2963C245.801 47.533 245.666 47.7696 245.514 48.0063C245.362 48.2598 245.159 48.4965 244.905 48.75C244.652 49.0036 244.432 49.1895 244.246 49.2909L242.691 49.5783L242.708 49.5952Z" fill="url(#paint5_linear_616_2162)"/>
    <path d="M297.495 49.5954C296.65 49.4771 295.855 49.325 295.111 49.1391C294.367 48.9531 293.641 48.6488 292.931 48.2432C292.221 47.8375 291.561 47.3304 290.953 46.7218C290.463 46.1133 289.989 45.471 289.584 44.7948C289.161 44.1187 288.823 43.4425 288.569 42.7326C288.316 42.0226 288.164 41.262 288.079 40.4675V24.9669C288.265 24.1555 288.485 23.361 288.738 22.5497C288.992 21.7383 289.364 20.9607 289.854 20.2001C290.344 19.4394 290.97 18.7463 291.697 18.1378C292.187 17.8335 292.694 17.5293 293.218 17.2419C293.742 16.9546 294.266 16.701 294.824 16.4982C295.382 16.2953 295.957 16.1263 296.582 16.008H321.786C322.598 16.2446 323.392 16.4813 324.204 16.7179C325.015 16.9715 325.759 17.3433 326.469 17.8335C327.179 18.3238 327.838 18.9492 328.447 19.676C328.869 20.1662 329.224 20.7072 329.546 21.2481C329.85 21.8059 330.086 22.4144 330.239 23.0906C330.391 23.7667 330.56 24.3752 330.763 24.95V40.3323C330.577 41.2113 330.34 42.0902 330.07 42.9354C329.799 43.7975 329.427 44.6089 328.92 45.3695C328.43 46.1302 327.771 46.8233 326.976 47.4318C326.486 47.8544 325.928 48.2094 325.302 48.4967C324.694 48.7841 324.052 49.0038 323.375 49.156C322.699 49.3081 322.023 49.4433 321.33 49.5616H297.512L297.495 49.5954ZM322.987 42.9354C323.409 42.6312 323.747 42.2931 323.984 41.9381C324.238 41.5831 324.407 41.1605 324.508 40.7041C324.609 40.2478 324.711 39.8252 324.829 39.4364V26.353C324.711 25.9642 324.626 25.5754 324.576 25.1528C324.525 24.7302 324.373 24.3414 324.119 24.0034C323.866 23.6653 323.595 23.3272 323.291 23.023C322.987 22.837 322.716 22.668 322.463 22.4989C322.209 22.3468 321.939 22.2454 321.634 22.1778C321.33 22.1271 321.026 22.0595 320.721 21.9749H297.816C297.512 22.0595 297.207 22.1271 296.903 22.1778C296.599 22.2285 296.295 22.3468 295.99 22.4989C295.686 22.6511 295.432 22.8877 295.246 23.192C295.061 23.4963 294.858 23.8005 294.638 24.0879C294.435 24.3752 294.283 24.6964 294.232 25.0683C294.182 25.4402 294.114 25.7613 294.029 26.0656V39.5547C294.097 39.9773 294.198 40.383 294.317 40.7887C294.435 41.1943 294.638 41.5662 294.925 41.9381C295.213 42.31 295.5 42.6312 295.821 42.9354L297.545 43.5101H321.364L323.037 42.9354H322.987Z" fill="url(#paint6_linear_616_2162)"/>
    <path d="M338.843 49.5954C338.657 49.4771 338.403 49.4095 338.099 49.3588C337.795 49.325 337.524 49.1898 337.321 48.9869C337.119 48.7841 336.916 48.5812 336.713 48.3784L336.138 47.2966V18.3069C336.595 17.2757 336.933 16.6841 337.152 16.5489C337.355 16.4136 337.626 16.2953 337.93 16.177C338.234 16.0587 338.539 16.008 338.843 16.008H339.756C341.176 16.4305 341.936 17.1912 342.055 18.3069V43.5101H376.387C377.385 43.9327 377.926 44.237 378.027 44.4229C378.129 44.6089 378.247 44.8624 378.399 45.1667C378.551 45.471 378.653 45.7752 378.72 46.0795C378.771 46.3838 378.805 46.7556 378.805 47.1613C378.382 48.5812 377.469 49.3757 376.049 49.5785H338.843V49.5954Z" fill="url(#paint7_linear_616_2162)"/>
    <path d="M387.155 49.5951C385.702 49.5612 384.721 48.8006 384.231 47.2962V18.3065C384.569 17.2415 385.042 16.5823 385.6 16.3625C386.175 16.1259 386.614 16.0245 386.919 16.0245H387.832C389.252 16.4471 390.012 17.2077 390.131 18.3234V47.3131C389.708 48.7668 388.711 49.5274 387.138 49.612L387.155 49.5951Z" fill="url(#paint8_linear_616_2162)"/>
    <path d="M403.198 49.5953C402.471 49.477 401.761 49.308 401.051 49.0544C400.341 48.8008 399.682 48.4797 399.073 48.074C399.073 48.074 398.465 47.6683 397.4 46.5527C397.011 45.9441 396.673 45.3187 396.368 44.6595C396.064 44.0002 395.844 43.3241 395.709 42.6141C395.574 41.9042 395.54 41.1435 395.625 40.349C396.047 39.2334 396.521 38.5742 397.062 38.3713C397.602 38.1685 398.025 38.0501 398.329 38.0501H399.242C400.273 38.3544 400.916 38.7094 401.135 39.1151C401.372 39.5208 401.541 40.18 401.643 41.0928C401.761 42.0901 402.031 42.7324 402.454 43.0367L403.316 43.4931H428.69C428.994 43.4255 429.332 43.3072 429.687 43.155C430.042 43.0029 430.38 42.817 430.684 42.6141C430.989 42.4113 431.276 42.1408 431.546 41.8366C431.766 41.5323 431.935 41.228 432.037 40.9238C432.138 40.6195 432.172 40.2645 432.172 39.8588C432.172 39.4531 432.223 39.0982 432.341 38.7939C432.223 38.4896 432.138 38.1347 432.087 37.729C432.037 37.3233 431.901 37.0021 431.715 36.7486C431.53 36.495 431.276 36.2245 430.972 35.9203C430.786 35.7343 430.549 35.5484 430.279 35.3963C430.008 35.2441 429.755 35.1427 429.501 35.0751C429.247 35.0244 428.977 34.9399 428.673 34.8216H405.023C404.178 34.737 403.333 34.5849 402.471 34.3313C401.609 34.0778 400.814 33.7566 400.054 33.334C399.31 32.9114 398.634 32.4043 398.008 31.7789C397.4 31.0858 396.859 30.3083 396.402 29.4462C395.946 28.5841 395.675 27.6882 395.591 26.7754C395.523 25.8626 395.523 24.8991 395.591 23.9018C395.675 23.175 395.828 22.4819 396.081 21.8396C396.335 21.1972 396.656 20.5887 397.078 20.0309C397.501 19.4731 397.991 18.9491 398.566 18.4588C399.175 18.0363 399.783 17.6475 400.409 17.3094C401.017 16.9713 401.66 16.7178 402.302 16.5656C402.961 16.4135 403.637 16.2276 404.364 15.9909H430.938C431.546 16.1092 432.172 16.2952 432.831 16.5318C433.474 16.7854 434.082 17.0897 434.64 17.4446C435.198 17.8165 435.722 18.2391 436.212 18.7293C436.753 19.3378 437.176 19.9802 437.48 20.6225C437.784 21.2818 438.021 21.9748 438.173 22.7524C438.325 23.513 438.376 24.2399 438.308 24.8991C438.258 25.5753 437.852 26.1838 437.125 26.7585C436.939 26.9445 436.685 27.0966 436.381 27.2149C436.077 27.3332 435.756 27.384 435.401 27.384H434.42C433.693 27.1135 433.152 26.7754 432.814 26.3528C432.476 25.9302 432.29 25.4908 432.29 25.0344C432.29 24.578 432.24 24.1385 432.121 23.7497C432.003 23.344 431.918 22.989 431.868 22.6848C431.817 22.3805 431.191 22.1269 430.008 21.941H405.378C404.99 22.0255 404.601 22.11 404.195 22.1945C403.789 22.296 403.418 22.4481 403.046 22.6509C402.674 22.8538 402.353 23.1242 402.048 23.4285C401.862 23.6145 401.727 23.868 401.676 24.1723C401.626 24.4765 401.575 24.747 401.541 25.0005C401.507 25.2541 401.49 25.5246 401.49 25.8288L402.234 27.4854C402.539 27.722 402.809 27.908 403.063 28.0601C403.316 28.2122 403.587 28.3306 403.891 28.432C404.195 28.5334 404.499 28.6348 404.804 28.7532H428.335C429.332 28.8377 430.279 29.0236 431.208 29.3279C432.121 29.6321 432.983 30.0378 433.795 30.5618C434.589 31.0859 435.367 31.7451 436.094 32.5396C436.702 33.3509 437.192 34.1792 437.531 35.0413C437.886 35.9034 438.072 36.8331 438.139 37.8473C438.19 38.8615 438.224 39.8588 438.224 40.8561C438.038 41.6675 437.801 42.4451 437.531 43.2057C437.26 43.9664 436.871 44.6764 436.381 45.3356C435.891 45.9948 435.265 46.6203 434.539 47.2288C433.964 47.7697 433.321 48.1754 432.595 48.4628C431.868 48.7501 431.141 48.9699 430.448 49.122C429.738 49.2741 428.977 49.4094 428.182 49.5277H403.147L403.198 49.5953Z" fill="url(#paint9_linear_616_2162)"/>
    <path d="M459.963 49.3413C462.194 48.868 464.544 48.4285 466.961 48.1242V30.1895H459.963V49.3413ZM459.963 25.4396V28.0427H466.961V25.4396H459.963Z" fill="url(#paint10_linear_616_2162)"/>
    <path d="M477.915 15.433H484.914V12.8129H477.915V15.433ZM477.915 47.3978C480.248 47.3978 482.581 47.4654 484.914 47.6344V17.5967L477.915 17.5969L477.915 47.3978ZM496.003 49.2064C498.437 49.7474 500.787 50.4404 503.001 51.2518V4.76682H496.003V49.2064ZM496.003 0V2.60316H503.018V0H496.003Z" fill="url(#paint11_linear_616_2162)"/>
    <path d="M503.018 51.1842C500.787 50.3728 498.454 49.6966 496.02 49.1557V4.76682L495.344 5.44297L492.149 8.58704V48.412C491.54 48.3105 490.915 48.2091 490.289 48.1246V8.24897L496.003 2.60316V0L488.379 7.52211V47.871C487.23 47.7358 486.08 47.6344 484.914 47.5499C482.598 47.3808 480.248 47.2963 477.915 47.3132L477.915 17.5969L477.425 18.0869L477.358 18.1376L473.858 21.6028V47.4485C473.301 47.4823 472.743 47.5161 472.185 47.5499V21.0957L477.899 15.4668V12.8468L470.275 20.3689V47.6851C469.159 47.7865 468.06 47.9049 466.961 48.0401C464.544 48.3443 462.194 48.7331 459.963 49.2233V30.2068L455.906 34.2298V50.2376C455.348 50.3897 454.79 50.5587 454.249 50.7278V33.7058L459.963 28.0769V25.4738L452.339 32.9959V51.387C448.755 52.6717 445.78 54.2268 443.718 55.9848C445.679 54.6156 448.671 53.3816 452.339 52.3167C452.965 52.1477 453.59 51.9617 454.266 51.8096C454.807 51.6744 455.348 51.5391 455.923 51.4039C457.224 51.1165 458.577 50.8461 459.98 50.5925C462.211 50.2037 464.544 49.8826 466.978 49.629C468.06 49.5107 469.176 49.4262 470.292 49.3417C470.917 49.291 471.559 49.2571 472.202 49.2233C472.76 49.1895 473.301 49.1726 473.875 49.1388C475.211 49.0881 476.563 49.0543 477.915 49.0374C480.231 49.0374 482.581 49.0881 484.914 49.2233C486.723 49.3248 488.515 49.4769 490.289 49.6966C490.915 49.7643 491.523 49.8488 492.149 49.9333C493.451 50.1023 494.752 50.3221 496.02 50.5587C498.42 50.9982 500.77 51.556 503.018 52.2153C506.349 53.2126 509.476 54.4466 512.265 55.9848C509.577 54.0409 506.45 52.4688 503.018 51.218V51.1842Z" fill="#F05129"/>
    <defs>
      <linearGradient id="paint0_linear_616_2162" x1="256.059" y1="55.9566" x2="256.059" y2="-0.0233433" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint1_linear_616_2162" x1="256.265" y1="-26.7373" x2="256.265" y2="-0.0282036" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint2_linear_616_2162" x1="256.062" y1="-26.7104" x2="256.062" y2="-0.0281753" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint3_linear_616_2162" x1="256.292" y1="-26.697" x2="256.292" y2="-0.0281611" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint4_linear_616_2162" x1="256.367" y1="-26.6822" x2="256.367" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint5_linear_616_2162" x1="256.265" y1="-26.7655" x2="256.265" y2="-0.0564073" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint6_linear_616_2162" x1="256.164" y1="-26.6822" x2="256.164" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint7_linear_616_2162" x1="256.265" y1="-26.6822" x2="256.265" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint8_linear_616_2162" x1="255.532" y1="-26.7104" x2="255.532" y2="-0.0281753" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint9_linear_616_2162" x1="256.696" y1="-26.6406" x2="256.696" y2="0.0281611" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="1" stop-color="#F26729"/>
      </linearGradient>
      <linearGradient id="paint10_linear_616_2162" x1="-331.174" y1="45.3738" x2="-328.855" y2="-27.0074" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="0.54" stop-color="#F99B28"/>
        <stop offset="1" stop-color="#FCBA63"/>
      </linearGradient>
      <linearGradient id="paint11_linear_616_2162" x1="256.438" y1="55.9848" x2="256.438" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F05129"/>
        <stop offset="0.5" stop-color="#F99B28"/>
        <stop offset="1" stop-color="#FCBA63"/>
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputType, setInputType] = useState<'upload' | 'paste'>('upload');
  const [pastedHtml, setPastedHtml] = useState('');
  const [selectedLang, setSelectedLang] = useState('eng');
  const [attachedImages, setAttachedImages] = useState<ImageAsset[]>([]);
  
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const markdownScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const renderMarkdownToHtml = (md: string) => {
    return md
      .replace(/^# (.*$)/gim, '<h1 class="preview-h1">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="preview-h2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="preview-h3">$1</h3>')
      .replace(/^\> (.*$)/gim, '<blockquote class="preview-blockquote">$1</blockquote>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" class="preview-img" />')
      .replace(/\n\n/gim, '</p><p class="preview-p">')
      .replace(/^- (.*$)/gim, '<ul class="preview-ul"><li class="preview-li">$1</li></ul>')
      .replace(/<\/ul>\n<ul class="preview-ul">/gim, '');
  };

  const handleScroll = (source: 'markdown' | 'preview') => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const sourceEl = source === 'markdown' ? markdownScrollRef.current : previewScrollRef.current;
    const targetEl = source === 'markdown' ? previewScrollRef.current : markdownScrollRef.current;
    if (sourceEl && targetEl) {
      const percentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight);
      targetEl.scrollTop = percentage * (targetEl.scrollHeight - targetEl.clientHeight);
    }
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/png');
        const id = `img_${Math.random().toString(36).substr(2, 9)}`;
        setAttachedImages(prev => [...prev, {
          id,
          name: `capture_${new Date().getTime()}.png`,
          base64,
          previewUrl: base64,
          type: 'image/png'
        }]);
        stopCamera();
      }
    }
  };

  const processFile = async (item: BatchItem, assets: ImageAsset[]): Promise<ConversionResult> => {
    let content = '';
    const { file } = item;

    if (file.name.endsWith('.pdf')) {
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        content += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        if (content.length < 50) {
          setOcrStatus(`OCR: ${file.name} - Page ${i}...`);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height; canvas.width = viewport.width;
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const { data: { text } } = await Tesseract.recognize(canvas, selectedLang);
            content += text;
          }
        }
      }
    } else if (file.name.endsWith('.docx')) {
      content = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else {
      content = await file.text();
    }

    const result = await optimizeMarkdownForAI(
      content, 
      file.name, 
      file.name.endsWith('.html'), 
      assets.map(a => ({ name: a.name, data: a.base64 }))
    );

    return {
      markdown: result,
      metadata: { 
        originalName: file.name, 
        wordCount: result.split(/\s+/).length, 
        estimatedTokens: Math.ceil(result.length / 4) 
      }
    };
  };

  const runBatchConversion = async (items: BatchItem[]) => {
    setStatus(AppStatus.BATCH_PROCESSING);
    const updatedItems = [...items];
    const imageAssets = [...attachedImages];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      updatedItems[i] = { ...item, status: 'processing' };
      setBatchItems([...updatedItems]);

      try {
        const result = await processFile(item, imageAssets);
        updatedItems[i] = { ...updatedItems[i], status: 'completed', result };
      } catch (err: any) {
        updatedItems[i] = { ...updatedItems[i], status: 'error', error: err.message };
      }
      setBatchItems([...updatedItems]);
      setOcrStatus('');
    }

    setStatus(AppStatus.SUCCESS);
  };

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    const docFiles = fileArray.filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.pdf') || f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type.startsWith('text/')
    );
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

    // Handle incoming images as global assets
    const fileToAsset = async (file: File): Promise<ImageAsset> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve({
            id: `img_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            base64: base64,
            previewUrl: URL.createObjectURL(file),
            type: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    };

    if (imageFiles.length > 0) {
      const newAssets = await Promise.all(imageFiles.map(fileToAsset));
      setAttachedImages(prev => [...prev, ...newAssets]);
    }

    if (docFiles.length > 0) {
      const newBatchItems: BatchItem[] = docFiles.map(f => ({
        id: `file_${Math.random().toString(36).substr(2, 9)}`,
        file: f,
        status: 'pending'
      }));
      setBatchItems(newBatchItems);
      runBatchConversion(newBatchItems);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedHtml.trim()) return;
    const virtualFile = new File([pastedHtml], "pasted_content.html", { type: 'text/html' });
    const virtualBatchItem: BatchItem = {
      id: `paste_${Date.now()}`,
      file: virtualFile,
      status: 'pending'
    };
    setBatchItems([virtualBatchItem]);
    runBatchConversion([virtualBatchItem]);
  };

  const downloadAll = () => {
    batchItems.forEach(item => {
      if (item.result) {
        const blob = new Blob([item.result.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.result.metadata.originalName.split('.')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  const reset = () => {
    setStatus(AppStatus.IDLE); setBatchItems([]); setError(null); setPastedHtml(''); setOcrStatus(''); setAttachedImages([]); setCurrentResultIndex(0);
  };

  const currentResult = batchItems[currentResultIndex]?.result;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col items-center">
        
        <header className="w-full flex flex-col items-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <MetropolisLogo />
          <div className="mt-8 flex items-center gap-3">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">AI Document Core</span>
            <div className="w-1 h-1 bg-[#E66C37] rounded-full animate-pulse" />
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-[#E66C37] uppercase tracking-[0.3em]">Markdown Engine</span>
          </div>
          <p className="text-[#F6F8FA]/50 font-medium max-w-lg text-center mt-6 text-sm tracking-wide leading-relaxed">
            Metropolis infrastructure for high-fidelity content restructuring. Secure, browser-native conversion with deep semantic mapping.
          </p>
        </header>

        <main className="w-full flex flex-col items-center">
          {status === AppStatus.IDLE && (
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                <button onClick={() => setInputType('upload')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all text-xs tracking-widest ${inputType === 'upload' ? 'bg-[#E66C37] text-white shadow-[0_8px_20px_rgba(230,108,55,0.2)]' : 'text-white/50 hover:text-white'}`}>
                  <FileUp className="w-4 h-4" /> UPLOAD SOURCE
                </button>
                <button onClick={() => setInputType('paste')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all text-xs tracking-widest ${inputType === 'paste' ? 'bg-[#E66C37] text-white shadow-[0_8px_20px_rgba(230,108,55,0.2)]' : 'text-white/50 hover:text-white'}`}>
                  <FileCode className="w-4 h-4" /> INJECT HTML
                </button>
              </div>

              {inputType === 'upload' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                      className={`w-full h-80 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all cursor-pointer glass-panel group
                        ${isDragging ? 'border-[#E66C37] bg-white/5 scale-[1.01]' : 'border-white/10 hover:border-white/30'}`}
                      onClick={() => document.getElementById('fileInput')?.click()}
                    >
                      <input id="fileInput" type="file" className="hidden" multiple accept=".docx,.pdf,.txt,.md,.html,.htm,image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                      <div className="bg-[#E66C37] p-6 rounded-3xl mb-4 text-white shadow-[0_0_30px_rgba(230,108,55,0.4)] group-hover:scale-110 transition-transform duration-500">
                        <FileUp className="w-10 h-10" />
                      </div>
                      <p className="font-poppins text-xl font-bold text-white uppercase tracking-[0.2em]">Drop Workspace</p>
                      <p className="text-white/30 text-xs font-black uppercase tracking-widest mt-1">PDF • Word • HTML • Images</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-[2.5rem]">
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-[#24B5DA]" /> ASSET REGISTRY
                      </h3>
                      <div className="space-y-4">
                        <button onClick={startCamera} className="w-full flex items-center gap-3 p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-[#E66C37]/40 transition-all font-black text-[10px] uppercase tracking-widest text-white/70">
                          <Camera className="w-4 h-4 text-[#E66C37]" /> CAMERA CAPTURE
                        </button>
                        <div className="flex items-center gap-3 p-5 bg-white/5 border border-white/5 rounded-2xl">
                          <Languages className="w-4 h-4 text-[#24B5DA]" />
                          <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="bg-transparent text-[10px] font-black text-white/70 w-full focus:outline-none cursor-pointer uppercase tracking-widest">
                            {SUPPORTED_LANGUAGES.map(lang => ( <option key={lang.code} value={lang.code} className="bg-[#0E1321]">{lang.label}</option> ))}
                          </select>
                        </div>
                      </div>

                      {attachedImages.length > 0 && (
                        <div className="mt-10 pt-6 border-t border-white/5">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-5 flex items-center justify-between">
                            <span>LOADED ASSETS</span>
                            <span className="text-[#E66C37]">{attachedImages.length}</span>
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            {attachedImages.map((img, idx) => (
                              <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                <img src={img.previewUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <button onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/90 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100">
                                  <X className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-[2.5rem] p-10 w-full border border-white/10">
                  <textarea className="w-full h-80 p-8 rounded-3xl border border-white/5 bg-black/30 font-mono text-sm text-white/70 focus:ring-1 focus:ring-[#E66C37] focus:outline-none mb-8 resize-none custom-scrollbar leading-relaxed" placeholder="Paste HTML content source here..." value={pastedHtml} onChange={(e) => setPastedHtml(e.target.value)} />
                  <button onClick={handlePasteSubmit} disabled={!pastedHtml.trim()} className="w-full py-6 bg-[#E66C37] text-white rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-950/30 uppercase tracking-[0.3em]">COMPILED OPTIMIZATION</button>
                </div>
              )}
            </div>
          )}

          {showCamera && (
            <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
              <div className="bg-[#0E1321] rounded-[3rem] w-full max-w-2xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-300">
                <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover bg-black" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="p-10 flex items-center justify-between bg-black/60 absolute bottom-0 left-0 right-0 backdrop-blur-2xl border-t border-white/5">
                  <button onClick={stopCamera} className="p-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"><X className="w-7 h-7" /></button>
                  <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full border-8 border-[#0E1321] flex items-center justify-center active:scale-95 transition-all shadow-2xl"><div className="w-18 h-18 rounded-full border-4 border-[#0E1321] bg-white" /></button>
                  <button onClick={() => { stopCamera(); startCamera(); }} className="p-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"><RefreshCw className="w-7 h-7" /></button>
                </div>
              </div>
            </div>
          )}

          {(status === AppStatus.BATCH_PROCESSING) && (
            <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-[4rem] w-full max-w-2xl border border-white/10 shadow-[0_0_100px_rgba(230,108,55,0.1)]">
              <div className="w-full mb-10 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 border-[6px] border-[#E66C37]/10 border-t-[#E66C37] rounded-full animate-spin" />
                  <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-[#24B5DA]" />
                </div>
                <h2 className="font-poppins text-2xl font-black text-white mb-2 uppercase tracking-widest">BATCH PROCESSING</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">{batchItems.filter(i => i.status === 'completed').length} / {batchItems.length} COMPLETED</p>
              </div>

              <div className="w-full max-h-60 overflow-y-auto custom-scrollbar space-y-3 px-2">
                {batchItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {item.status === 'processing' ? <Loader2 className="w-4 h-4 text-[#E66C37] animate-spin" /> : 
                       item.status === 'completed' ? <FileCheck className="w-4 h-4 text-[#1AAB40]" /> : 
                       item.status === 'error' ? <AlertCircle className="w-4 h-4 text-[#D64554]" /> : 
                       <FileText className="w-4 h-4 text-white/20" />}
                      <span className="text-xs font-bold text-white/60 truncate">{item.file.name}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      item.status === 'processing' ? 'text-[#E66C37] bg-[#E66C37]/10' :
                      item.status === 'completed' ? 'text-[#1AAB40] bg-[#1AAB40]/10' :
                      item.status === 'error' ? 'text-[#D64554] bg-[#D64554]/10' :
                      'text-white/20 bg-white/5'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              
              {ocrStatus && (
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-[#24B5DA] uppercase tracking-widest animate-pulse">
                  <ScanSearch className="w-3.5 h-3.5" />
                  {ocrStatus}
                </div>
              )}
            </div>
          )}

          {status === AppStatus.SUCCESS && batchItems.length > 0 && (
            <div className="w-full flex flex-col xl:flex-row gap-10 items-start animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="w-full xl:w-96 flex flex-col gap-8 xl:sticky xl:top-8">
                <div className="glass-panel p-8 rounded-[3rem] border border-white/10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-green-500/20 p-3 rounded-2xl shadow-[0_0_20px_rgba(26,171,64,0.1)]"><CheckCircle className="w-6 h-6 text-[#1AAB40]" /></div>
                    <h2 className="font-poppins text-lg font-black text-white tracking-widest uppercase">CONVERTED</h2>
                  </div>
                  
                  <div className="mb-8">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">SELECT OUTPUT ({batchItems.length})</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {batchItems.map((item, idx) => (
                        <button 
                          key={item.id} 
                          onClick={() => setCurrentResultIndex(idx)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            currentResultIndex === idx ? 'bg-[#E66C37]/10 border-[#E66C37] text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-[10px] font-bold truncate max-w-[150px]">{item.file.name}</span>
                          {item.status === 'completed' ? <CheckCircle className="w-3 h-3 text-[#1AAB40]" /> : <AlertCircle className="w-3 h-3 text-[#D64554]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button onClick={downloadAll} className="flex items-center justify-center gap-3 w-full py-5 bg-[#F6F8FA] text-[#0E1321] rounded-2xl font-black hover:bg-white transition-all text-xs uppercase tracking-[0.2em] shadow-xl"><Download className="w-4 h-4" /> EXPORT ALL (.MD)</button>
                    <button onClick={reset} className="mt-6 flex items-center justify-center gap-3 w-full py-2 text-white/20 font-black text-[10px] hover:text-[#D64554] transition-colors uppercase tracking-[0.4em]"><Trash2 className="w-4 h-4" /> RESET SESSION</button>
                  </div>
                </div>
                
                <div className="metropolis-gradient p-10 rounded-[3rem] text-white shadow-2xl flex items-center gap-6">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md shadow-inner"><ShieldCheck className="w-8 h-8" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">SANDBOX MODE</p>
                    <p className="text-[10px] text-white/80 leading-relaxed font-bold">Encrypted local workspace active. Data volatile in memory.</p>
                  </div>
                </div>
              </div>

              <div className="flex-grow flex flex-col gap-8 w-full">
                {currentResult ? (
                  <div className="flex flex-col lg:flex-row gap-8 h-[80vh] w-full">
                    <div className="flex-1 bg-black/50 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                      <div className="px-10 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-3">
                          <Code className="w-5 h-5 text-[#24B5DA]" />
                          <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em]">SOURCE: {batchItems[currentResultIndex].file.name}</span>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(currentResult.markdown); alert("COPIED TO CLIPBOARD"); }} className="p-2 text-white/40 hover:text-white transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div ref={markdownScrollRef} onScroll={() => handleScroll('markdown')} className="flex-grow overflow-y-auto custom-scrollbar">
                        <SyntaxHighlighter language="markdown" style={darkStyle} customStyle={{ padding: '3rem', fontSize: '0.9rem', backgroundColor: 'transparent', margin: 0, lineHeight: '1.7' }}>{currentResult.markdown}</SyntaxHighlighter>
                      </div>
                    </div>

                    <div className="flex-1 glass-panel rounded-[3rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                      <div className="px-10 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-3"><Eye className="w-5 h-5 text-[#E66C37]" /><span className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em]">RENDERED PREVIEW</span></div>
                      </div>
                      <div ref={previewScrollRef} onScroll={() => handleScroll('preview')} className="flex-grow overflow-y-auto custom-scrollbar p-12 bg-white">
                        <div className="prose-container max-w-none text-slate-900"><div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(currentResult.markdown) }} /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center glass-panel rounded-[3rem] border border-white/5 p-20 text-center">
                    <div>
                      <AlertCircle className="w-16 h-16 text-[#D64554] mx-auto mb-6" />
                      <h2 className="text-xl font-black text-white uppercase tracking-widest">Processing Error</h2>
                      <p className="text-white/40 text-sm mt-2">{batchItems[currentResultIndex]?.error || "This file could not be optimized."}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {status === AppStatus.ERROR && (
            <div className="flex flex-col items-center justify-center p-20 glass-panel rounded-[4rem] border border-[#D64554]/30 w-full max-w-2xl text-center shadow-[0_0_80px_rgba(214,69,84,0.1)]">
              <div className="bg-[#D64554]/20 p-6 rounded-3xl mb-8"><AlertCircle className="w-16 h-16 text-[#D64554] animate-pulse" /></div>
              <h2 className="font-poppins text-2xl font-black text-white mb-4 uppercase tracking-[0.3em]">PROCESSING FAULT</h2>
              <p className="text-white/40 text-sm mb-10 font-bold uppercase tracking-widest">{error}</p>
              <button onClick={reset} className="px-12 py-5 bg-[#D64554] text-white rounded-2xl font-black shadow-2xl shadow-red-950/40 uppercase tracking-[0.3em] text-xs hover:bg-[#D64554]/90 transition-all">RE-INITIATE LAYER</button>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .preview-h1 { font-family: 'Poppins', sans-serif; font-size: 2.5rem; font-weight: 800; color: #0E1321; margin-bottom: 2rem; border-bottom: 4px solid #E66C37; padding-bottom: 0.75rem; letter-spacing: -0.02em; }
        .preview-h2 { font-family: 'Poppins', sans-serif; font-size: 1.8rem; font-weight: 700; color: #0E1321; margin: 2.5rem 0 1.25rem; letter-spacing: -0.01em; }
        .preview-h3 { font-family: 'Poppins', sans-serif; font-size: 1.4rem; font-weight: 700; color: #1e293b; margin: 2rem 0 1rem; }
        .preview-p { margin-bottom: 1.5rem; color: #334155; line-height: 1.8; font-size: 1.05rem; }
        .preview-img { max-width: 100%; border-radius: 20px; margin: 2.5rem 0; box-shadow: 0 20px 50px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; }
        .preview-blockquote { border-left: 8px solid #E66C37; background: #FFF7F3; padding: 2rem; margin: 2.5rem 0; border-radius: 0 16px 16px 0; color: #7C2D12; font-style: italic; font-size: 1.1rem; line-height: 1.7; }
        .preview-ul { list-style-type: disc; margin-left: 2.5rem; margin-bottom: 2rem; color: #334155; }
        .preview-li { margin-bottom: 0.75rem; line-height: 1.6; }
        
        .prose-container strong { color: #0E1321; font-weight: 800; }
        .prose-container em { color: #E66C37; font-weight: 500; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default App;
