<template>
  <div class="min-h-screen bg-[#090d16] text-slate-100">
    <header class="border-b border-slate-800 bg-slate-950/80">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-slate-950"><Building2 class="h-5 w-5" /></div><div><h1 class="text-sm font-black">MedTracker Platform</h1><p class="text-[11px] text-slate-500">Управление медицинскими организациями</p></div></div>
        <button class="rounded-xl border border-slate-800 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white" @click="logout"><LogOut class="mr-1 inline h-4 w-4" />Выйти</button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="text-xs font-bold uppercase tracking-widest text-emerald-400">B2B SaaS</p><h2 class="mt-1 text-2xl font-black">Медицинские клиники</h2><p class="mt-1 text-sm text-slate-400">Каждая организация работает в изолированном контуре данных.</p></div><button class="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950" @click="openCreate"><Plus class="h-4 w-4" />Добавить клинику</button></div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="clinic in clinics" :key="clinic.id" class="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div class="flex items-start justify-between gap-3"><div class="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400"><Hospital class="h-5 w-5" /></div><span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400">{{ clinic.status }}</span></div>
          <h3 class="mt-4 text-lg font-black">{{ clinic.name }}</h3><p class="mt-1 text-xs text-slate-500">{{ clinic.legalName }}</p>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt class="text-slate-500">БИН</dt><dd class="mt-1 font-mono font-bold">{{ clinic.bin }}</dd></div><div><dt class="text-slate-500">Город</dt><dd class="mt-1 font-bold">{{ clinic.city }}</dd></div><div><dt class="text-slate-500">Тариф</dt><dd class="mt-1 font-bold text-cyan-400">{{ clinic.plan }}</dd></div><div><dt class="text-slate-500">Телефон</dt><dd class="mt-1 font-bold">{{ clinic.contactPhone }}</dd></div></dl>
        </article>
      </div>
    </main>

    <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/85 p-4" @click.self="showCreate=false"><form class="my-6 w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl" @submit.prevent="createClinic"><div class="flex items-center justify-between"><div><h2 class="text-lg font-black">Новая медицинская организация</h2><p class="text-xs text-slate-500">Организация и аккаунт её владельца</p></div><button type="button" class="p-2 text-slate-500 hover:text-white" @click="showCreate=false"><X class="h-5 w-5" /></button></div>
      <div class="mt-5 grid gap-3 sm:grid-cols-2"><label v-for="field in fields" :key="field.key" :class="field.wide?'sm:col-span-2':''" class="text-xs font-bold text-slate-400">{{ field.label }}<input v-model="form[field.key]" :type="field.type||'text'" required :placeholder="field.placeholder" class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400" /></label></div>
      <p v-if="error" class="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">{{ error }}</p><div class="mt-6 flex justify-end gap-2"><button type="button" class="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold" @click="showCreate=false">Отмена</button><button :disabled="saving" class="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 disabled:opacity-60">{{ saving?'Создание…':'Создать клинику' }}</button></div></form></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Building2, Hospital, LogOut, Plus, X } from 'lucide-vue-next';

interface Clinic { id:string; name:string; legalName:string; bin:string; city:string; contactPhone:string; plan:string; status:string }
type FormKey = 'name'|'legalName'|'bin'|'city'|'contactPhone'|'ownerName'|'ownerEmail'|'ownerPassword';
const clinics=ref<Clinic[]>([]),showCreate=ref(false),saving=ref(false),error=ref(''); const router=useRouter(),auth=useAuthStore();
const form=reactive<Record<FormKey,string>>({name:'',legalName:'',bin:'',city:'Алматы',contactPhone:'',ownerName:'',ownerEmail:'',ownerPassword:''});
const fields:{key:FormKey;label:string;placeholder?:string;type?:string;wide?:boolean}[]=[{key:'name',label:'Название',placeholder:'Sana Clinic'},{key:'legalName',label:'Юридическое название',placeholder:'ТОО «Sana Clinic»'},{key:'bin',label:'БИН',placeholder:'12 цифр'},{key:'city',label:'Город'},{key:'contactPhone',label:'Контактный телефон'},{key:'ownerName',label:'ФИО владельца'},{key:'ownerEmail',label:'Email владельца',type:'email'},{key:'ownerPassword',label:'Временный пароль',type:'password',wide:true}];
async function load(){const res=await apiFetch('/api/platform/clinics');if(res.ok)clinics.value=await res.json()}
function openCreate(){error.value='';showCreate.value=true}
async function createClinic(){saving.value=true;error.value='';try{const res=await apiFetch('/api/platform/clinics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error);clinics.value.push(data.clinic);showCreate.value=false;Object.assign(form,{name:'',legalName:'',bin:'',city:'Алматы',contactPhone:'',ownerName:'',ownerEmail:'',ownerPassword:''})}catch(e){error.value=e instanceof Error?e.message:'Не удалось создать клинику'}finally{saving.value=false}}
async function logout(){await auth.logout();router.replace('/login')}
onMounted(load);
</script>
