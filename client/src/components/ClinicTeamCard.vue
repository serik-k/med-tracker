<template>
  <section class="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-xl">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><h2 class="flex items-center gap-2 text-lg font-black"><Users class="h-5 w-5 text-cyan-400" />Сотрудники клиники</h2><p class="mt-1 text-xs text-slate-400">Только сотрудники имеют постоянные аккаунты</p></div>
      <button class="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/20" @click="showModal=true"><UserPlus class="h-4 w-4" />Добавить сотрудника</button>
    </div>
    <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="user in users" :key="user.id" class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300"><UserRound class="h-4 w-4" /></div><div class="min-w-0"><p class="truncate text-sm font-black text-white">{{ user.name }}</p><p class="truncate text-[11px] text-slate-500">{{ user.email }}</p></div><span class="ml-auto shrink-0 rounded-full bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase text-cyan-400">{{ roleName(user.role) }}</span></div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[70] grid place-items-center bg-slate-950/85 p-4" @click.self="showModal=false"><form class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl" @submit.prevent="createUser"><div class="flex items-center justify-between"><div><h3 class="text-lg font-black">Новый сотрудник</h3><p class="text-xs text-slate-500">Аккаунт будет привязан к этой клинике</p></div><button type="button" class="p-2 text-slate-500 hover:text-white" @click="showModal=false"><X class="h-5 w-5" /></button></div><div class="mt-5 space-y-3"><label class="block text-xs font-bold text-slate-400">ФИО<input v-model.trim="form.name" required class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400" /></label><label class="block text-xs font-bold text-slate-400">Email<input v-model.trim="form.email" type="email" required class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400" /></label><label class="block text-xs font-bold text-slate-400">Роль<select v-model="form.role" class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white outline-none"><option value="dispatcher">Диспетчер</option><option value="clinic_admin">Администратор клиники</option></select></label><label class="block text-xs font-bold text-slate-400">Временный пароль<input v-model="form.password" type="password" minlength="8" required class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400" /></label></div><p v-if="error" class="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">{{ error }}</p><div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold" @click="showModal=false">Отмена</button><button :disabled="saving" class="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-black text-slate-950 disabled:opacity-60">{{ saving?'Создание…':'Создать аккаунт' }}</button></div></form></div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { apiFetch } from '@/services/api';
import { UserPlus, UserRound, Users, X } from 'lucide-vue-next';
interface TeamUser{id:string;name:string;email:string;role:string}
const users=ref<TeamUser[]>([]),showModal=ref(false),saving=ref(false),error=ref('');
const form=reactive({name:'',email:'',role:'dispatcher',password:''});
const roleName=(role:string)=>({clinic_owner:'Владелец',clinic_admin:'Администратор',dispatcher:'Диспетчер'}[role]||role);
async function load(){const res=await apiFetch('/api/clinic/users');if(res.ok)users.value=await res.json()}
async function createUser(){saving.value=true;error.value='';try{const res=await apiFetch('/api/clinic/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error);users.value.push(data);Object.assign(form,{name:'',email:'',role:'dispatcher',password:''});showModal.value=false}catch(e){error.value=e instanceof Error?e.message:'Не удалось создать сотрудника'}finally{saving.value=false}}
onMounted(load);
</script>
